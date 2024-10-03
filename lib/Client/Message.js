const Base = require('./Base');
const config = require('../../config');
const ReplyMessage = require('./ReplyMessage');
const fileType = require('file-type');
const patches = require('./Patch');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp, isUrl } = require('../Utils');
const { generateWAMessageFromContent, generateWAMessage, generateForwardMessageContent, getContentType } = require('baileys');
const axios = require('axios');

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
   senderID: senderID,
   message: { key, message },
   pushName,
   sender: pushName,
   participant: parsedJid(senderID)[0],
   sudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
   botDev: this.#isDev(this.jid),
   text: data.body,
   fromMe: key.fromMe,
   isBaileys: key.id.startsWith('BAE5'),
   timestamp: messageTimestamp.low || messageTimestamp,
   mention: contextInfo?.mentionedJid || false,
   isAdmin: isGroup ? this.client.isAdmin(this.jid, this.participant) : false,
   isBot: this.fromMe,
   chatName: isGroup ? this.client.getGroupName(this.jid) : pushName,
   messageType: Object.keys(message)[0],
   isImage: Boolean(message.imageMessage),
   isVideo: Boolean(message.videoMessage),
   isAudio: Boolean(message.audioMessage),
   isSticker: Boolean(message.stickerMessage),
   isDocument: Boolean(message.documentMessage),
   isViewOnce: Boolean(message.viewOnceMessage),
   isForwarded: Boolean(message.forwardingScore),
   forwardingScore: message.forwardingScore || 0,
   isQuotedImage: quoted?.type === 'imageMessage',
   isQuotedVideo: quoted?.type === 'videoMessage',
   isQuotedAudio: quoted?.type === 'audioMessage',
   isQuotedSticker: quoted?.type === 'stickerMessage',
   isQuotedDocument: quoted?.type === 'documentMessage',
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
    isImage: quoted.type === 'imageMessage',
    isVideo: quoted.type === 'videoMessage',
    isAudio: quoted.type === 'audioMessage',
    isSticker: quoted.type === 'stickerMessage',
    isDocument: quoted.type === 'documentMessage',
    caption: quoted.message[quoted.type]?.caption || '',
    fileSize: quoted.message[quoted.type]?.fileSize || 0,
    duration: quoted.message[quoted.type]?.seconds || 0,
    mimetype: quoted.message[quoted.type]?.mimetype || '',
   });
  } else {
   this.reply_message = false;
  }
  return super._patch(data);
 }
 #isDev(jid) {
  try {
   return patches.DEV.split(',').includes(jid.split('@')[0]);
  } catch {
   return false;
  }
 }
 async sendMessage(jid, content, opt = { packname: 'Xasena', author: 'X-electra', fileName: 'X-Asena' }, type = 'text') {
  const sendBuffer = (key) => this.client.sendMessage(jid, { [key]: content, ...opt });
  const sendUrl = (key) => this.client.sendMessage(jid, { [key]: { url: content }, ...opt });

  const types = {
   text: () => this.client.sendMessage(jid, { text: content, ...opt }),
   image: () => (Buffer.isBuffer(content) ? sendBuffer('image') : isUrl(content) ? sendUrl('image') : null),
   video: () => (Buffer.isBuffer(content) ? sendBuffer('video') : isUrl(content) ? sendUrl('video') : null),
   audio: () => (Buffer.isBuffer(content) ? sendBuffer('audio') : isUrl(content) ? sendUrl('audio') : null),
   template: async () => {
    const optional = await generateWAMessage(jid, content, opt);
    await this.client.relayMessage(jid, { viewOnceMessage: { message: { ...optional.message } } }, { messageId: optional.key.id });
   },
   interactive: async () => {
    const genMessage = createInteractiveMessage(content);
    await this.client.relayMessage(jid, genMessage.message, { messageId: genMessage.key.id });
   },
   sticker: async () => {
    const { data, mime } = await this.client.getFile(content);
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
    } else {
     const mimePrefix = mime.split('/')[0];
     if (mimePrefix === 'video' || mimePrefix === 'image') {
      await this.client.sendImageAsSticker(this.jid, content, opt);
     }
    }
   },
   document: () => {
    if (!opt.mimetype) throw new Error('Mimetype is required for document');
    return Buffer.isBuffer(content) ? sendBuffer('document') : isUrl(content) ? sendUrl('document') : null;
   },
   pdf: () => {
    opt.mimetype = opt.mimetype || 'application/pdf';
    return Buffer.isBuffer(content) ? sendBuffer('document') : isUrl(content) ? sendUrl('document') : null;
   },
  };

  const action = types[type.toLowerCase()];
  if (!action) throw new Error('Unsupported message type');
  return action();
 }

 async sendReply(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text }, { ...opt, quoted: this.data });
 }

 async log() {
  console.log(this.data);
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
 }

 async sendFile(content, options = {}) {
  const { data } = await this.client.getFile(content);
  const { mime } = (await fileType.fromBuffer(data)) || {};
  if (!mime) throw new Error('Unable to determine the file type.');

  const messageType = mime.split('/')[0];
  const messageContent = { [messageType]: data };

  return this.client.sendMessage(options.jid || this.jid, messageContent, options);
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
 }

 async reply(text, options = {}) {
  const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async sendFromUrl(url, options = {}) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);
  const { mime } = (await fileType.fromBuffer(buffer)) || {};
  if (!mime) throw new Error('Unable to determine file type');
  const [mediaType] = mime.split('/');
  return this.client.sendMessage(this.jid, { [mediaType]: buffer, mimetype: mime, ...options });
 }

 async send(content, options = {}) {
  const jid = this.jid || options.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  const mergedOptions = { packname: 'ғxᴏᴘ-ᴍᴅ', author: 'ᴀsᴛʀᴏ', quoted: this, ...options };
  const type = options.type || (await this.detectType(content));

  const sendMedia = (mediaType) =>
   this.client.sendMessage(jid, {
    [mediaType]: Buffer.isBuffer(content) ? content : { url: content },
    ...mergedOptions,
   });

  const types = {
   text: () => this.client.sendMessage(jid, { text: content, ...mergedOptions }),
   image: sendMedia,
   video: sendMedia,
   audio: sendMedia,
   sticker: async () => {
    const { data, mime } = await this.client.getFile(content);
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(data, mergedOptions);
     return this.client.sendMessage(jid, { sticker: { url: buff }, ...mergedOptions }, mergedOptions);
    }
    return this.client.sendImageAsSticker(jid, content, mergedOptions);
   },
  };

  const patchedMSg = types[type];
  if (!patchedMSg) throw new Error(`Unsupported message type: ${type}`);

  return patchedMSg(type);
 }

 async fdMSg(jid, message, options = {}) {
  const forwardedContext = {
   contextInfo: {
    isForwarded: true,
   },
  };
  const m = generateWAMessageFromContent(jid, message, {
   ...options,
   ...forwardedContext,
   userJid: this.client.user.id,
  });

  await this.client.relayMessage(jid, m.message, {
   messageId: m.key.id,
   ...options,
  });

  return m;
 }

 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content;
   const viewOnceKey = Object.keys(content)[0];
   delete content?.ignore;
   delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce;
   content = { ...content?.viewOnceMessage?.message };
  }
  if (options.mentions) content[getContentType(content)].contextInfo.mentionedJid = options.mentions;
  const forwardContent = generateForwardMessageContent(content, false);
  const contentType = getContentType(forwardContent);

  const forwardOptions = {
   ptt: options.ptt,
   waveform: options.audiowave,
   seconds: options.seconds,
   fileLength: options.fileLength,
   caption: options.caption,
   contextInfo: options.contextInfo,
  };

  if (options.mentions) forwardOptions.contextInfo.mentionedJid = options.mentions;
  if (contentType !== 'conversation') forwardOptions.contextInfo = content?.message[contentType]?.contextInfo || {};

  forwardContent[contentType].contextInfo = {
   ...forwardOptions.contextInfo,
   ...forwardContent[contentType]?.contextInfo,
  };

  const waMessage = generateWAMessageFromContent(jid, forwardContent, {
   ...forwardContent[contentType],
   ...forwardOptions,
  });
  return await this.client.relayMessage(jid, waMessage.message, {
   messageId: waMessage.key.id,
  });
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
  for await (const chunk of stream) {
   chunks.push(chunk);
  }
  return Buffer.concat(chunks);
 }

 async detectType(content) {
  if (typeof content === 'string') {
   return isUrl(content) ? await fetch(content, { method: 'HEAD' }).then((r) => r.headers.get('content-type')?.split('/')[0]) : 'text';
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

 async add(jid) {
  return this.groupManage('add', jid);
 }
 async kick(jid) {
  return this.groupManage('remove', jid);
 }
 async promote(jid) {
  return this.groupManage('promote', jid);
 }
 async demote(jid) {
  return this.groupManage('demote', jid);
 }

 // User management methods
 async updateName(name) {
  return this.client.updateProfileName(name);
 }
 async getPP(jid) {
  return this.client.profilePictureUrl(jid, 'image');
 }
 async setPP(jid, pp) {
  const profilePicture = Buffer.isBuffer(pp) ? pp : { url: pp };
  return this.client.updateProfilePicture(jid, profilePicture);
 }
 async block(jid) {
  return this.client.updateBlockStatus(jid, 'block');
 }
 async unblock(jid) {
  return this.client.updateBlockStatus(jid, 'unblock');
 }

 async PresenceUpdate(status) {
  return this.client.sendPresenceUpdate(status, this.jid);
 }
 async delete(key) {
  return this.client.sendMessage(this.jid, { delete: key });
 }
}

module.exports = Message;
