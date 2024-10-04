const Base = require('./base');
const config = require('../config');
const ReplyMessage = require('./message_reply');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../utils');
const { generateWAMessageFromContent, generateWAMessage, generateForwardMessageContent, getContentType } = require('baileys');
const fileType = require('file-type');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  const { key, isGroup, message, pushName, messageTimestamp, quoted } = data;
  const contextInfo = message?.extendedTextMessage?.contextInfo;
  const senderID = contextInfo?.participant || key.remoteJid;

  Object.assign(this, {
   user: decodeJid(this.client.user.id),
   key,
   isGroup,
   prefix: config.HANDLERS.replace(/[\[\]]/g, ''),
   id: key.id,
   jid: key.remoteJid,
   chat: key.remoteJid,
   senderID,
   message: { key, message },
   pushName,
   sender: pushName,
   participant: parsedJid(senderID)[0],
   sudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
   text: data.body,
   fromMe: key.fromMe,
   isBaileys: key.id.startsWith('BAE5'),
   timestamp: messageTimestamp.low || messageTimestamp,
   mention: contextInfo?.mentionedJid || false,
   isOwner: key.fromMe,
   messageType: Object.keys(message)[0],
   isViewOnce: Boolean(message.viewOnceMessage),
  });

  if (quoted && !message.buttonsResponseMessage) {
   this.reply_message = new ReplyMessage(this.client, contextInfo, quoted);
   Object.assign(this.reply_message, {
    type: quoted.type || 'extendedTextMessage',
    mtype: quoted.mtype,
    key: quoted.key,
    mention: quoted.message.extendedTextMessage?.contextInfo?.mentionedJid || false,
    sender: contextInfo?.participant || quoted.key.remoteJid,
    senderNumber: (contextInfo?.participant || quoted.key.remoteJid)?.split('@')[0] || false,
   });
  } else {
   this.reply_message = false;
  }
  if (message.stickerMessage) {
   this.sticker = true;
  }
  if (message.videoMessage) {
   this.video = message.videoMessage;
  }
  if (message.imageMessage) {
   this.image = message.imageMessage;
  }

  return super._patch(data);
 }

 async sendMessage(jid, content, opt = {}, type = 'text') {
  const sendFunc = {
   text: () => this.client.sendMessage(jid, { text: content, ...opt }),
   image: () => this.sendMedia('image', content, opt),
   video: () => this.sendMedia('video', content, opt),
   audio: () => this.sendMedia('audio', content, opt),
   template: async () => {
    const msg = await generateWAMessage(jid, content, opt);
    return this.client.relayMessage(jid, { viewOnceMessage: { message: { ...msg.message } } }, { messageId: msg.key.id });
   },
   interactive: async () => {
    const msg = createInteractiveMessage(content);
    return this.client.relayMessage(jid, msg.message, { messageId: msg.key.id });
   },
   sticker: async () => {
    const { data, mime } = await this.client.getFile(content);
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     return this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
    }
    return this.client.sendImageAsSticker(this.jid, content, opt);
   },
   document: () => this.sendMedia('document', content, { ...opt, mimetype: opt.mimetype || 'application/octet-stream' }),
   pdf: () => this.sendMedia('document', content, { ...opt, mimetype: 'application/pdf' }),
  };

  return (
   sendFunc[type.toLowerCase()] ||
   (() => {
    throw new Error('Unsupported message type');
   })
  )();
 }

 async sendMedia(type, content, opt = {}) {
  const isBuffer = Buffer.isBuffer(content);
  const isUrl = typeof content === 'string' && content.startsWith('http');
  return this.client.sendMessage(opt.jid || this.jid, {
   [type]: isBuffer ? content : isUrl ? { url: content } : content,
   ...opt,
  });
 }

 async reply(text, options = {}) {
  const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async sendReply(text, options = {}) {
  return this.reply(text, options);
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }

 async send(content, options = {}) {
  const jid = this.jid || options.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  const type = options.type || (await this.detectType(content));
  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this, ...options };

  return this.sendMessage(jid, content, mergedOptions, type);
 }

 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content;
   const viewOnceKey = Object.keys(content)[0];
   delete content?.ignore;
   delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce;
   content = { ...content?.viewOnceMessage?.message };
  }

  const forwardContent = generateForwardMessageContent(content, false);
  const contentType = getContentType(forwardContent);

  const forwardOptions = {
   ...options,
   contextInfo: {
    ...(options.contextInfo || {}),
    ...(content?.message[contentType]?.contextInfo || {}),
   },
  };

  if (options.mentions) forwardOptions.contextInfo.mentionedJid = options.mentions;

  const waMessage = generateWAMessageFromContent(jid, forwardContent, forwardOptions);
  return this.client.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
 }

 async download() {
  if (!this.message.message) throw new Error('No message content to download');
  const messageType = Object.keys(this.message.message)[0];
  if (!['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(messageType)) {
   throw new Error('Unsupported media type');
  }
  const stream = await this.client.downloadContentFromMessage(this.message.message[messageType], messageType.split('Message')[0]);
  return Buffer.concat(await this.streamToBuffer(stream));
 }

 async streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
 }

 async detectType(content) {
  if (typeof content === 'string') {
   return isUrl(content) ? (await fetch(content, { method: 'HEAD' })).headers.get('content-type')?.split('/')[0] : 'text';
  }
  if (Buffer.isBuffer(content)) {
   const { mime } = (await fileType.fromBuffer(content)) || {};
   return mime?.split('/')[0] || 'text';
  }
  return 'text';
 }

 async groupManage(action, jid) {
  return this.client.groupParticipantsUpdate(this.jid, jid, action);
 }

 add = (jid) => this.groupManage('add', jid);
 kick = (jid) => this.groupManage('remove', jid);
 promote = (jid) => this.groupManage('promote', jid);
 demote = (jid) => this.groupManage('demote', jid);

 updateName = (name) => this.client.updateProfileName(name);
 getPP = (jid) => this.client.profilePictureUrl(jid, 'image');
 setPP = (jid, pp) => this.client.updateProfilePicture(jid, Buffer.isBuffer(pp) ? pp : { url: pp });
 block = (jid) => this.client.updateBlockStatus(jid, 'block');
 unblock = (jid) => this.client.updateBlockStatus(jid, 'unblock');

 PresenceUpdate = (status) => this.client.sendPresenceUpdate(status, this.jid);
 delete = (key) => this.client.sendMessage(this.jid, { delete: key });
}

module.exports = Message;