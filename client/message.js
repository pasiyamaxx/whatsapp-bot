const Base = require('./base');
const config = require('../config');
const ReplyMessage = require('./message_reply');
const GroupManager = require('./group_manager');
const UserProfileManager = require('./chats_manager');
const { decodeJid, parsedJid, writeExifWebp, isUrl } = require('../utils');
const { generateWAMessageFromContent, generateForwardMessageContent, getContentType } = require('baileys');
const fileType = require('file-type');
const fs = require('fs').promises;

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);

  this.groupManager = new GroupManager(this.client, data);
  this.chatManger = new UserProfileManager(this.client, data);

  return new Proxy(this, {
   get(target, prop) {
    if (typeof target.groupManager[prop] === 'function') {
     return (...args) => target.groupManager[prop](...args);
    }
    if (typeof target.chatManger[prop] === 'function') {
     return (...args) => target.chatManger[prop](...args);
    }
    return target[prop];
   },
  });
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
  if (message.stickerMessage) this.sticker = true;
  if (message.videoMessage) this.video = message.videoMessage;
  if (message.imageMessage) this.image = message.imageMessage;

  return super._patch(data);
 }

 async sendMessage(jid, content, opt = {}) {
  return this.client.sendMessage(jid || this.jid, content, opt);
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
  const jid = options.jid || this.jid;
  if (!jid) throw new Error('JID is required to send a message.');

  let messageContent = {};
  let messageType = options.type;

  if (!messageType) {
   messageType = await this.detectType(content);
  }

  switch (messageType) {
   case 'text':
    messageContent = { text: content };
    break;
   case 'image':
   case 'video':
   case 'audio':
   case 'document':
    const mediaContent = await this.prepareMediaContent(content, messageType);
    messageContent = { [messageType]: mediaContent };
    break;
   case 'sticker':
    const stickerContent = await this.prepareStickerContent(content, options);
    messageContent = { sticker: stickerContent };
    break;
   default:
    throw new Error(`Unsupported message type: ${messageType}`);
  }

  const quotedMessage = options.quoted ? { quoted: options.quoted } : {};
  const mergedOptions = {
   ...quotedMessage,
   ...options,
  };

  return this.client.sendMessage(jid, messageContent, mergedOptions);
 }

 async prepareMediaContent(content, type) {
  if (Buffer.isBuffer(content)) {
   return content;
  } else if (isUrl(content)) {
   return { url: content };
  } else if (typeof content === 'string') {
   const buffer = await fs.readFile(content);
   return buffer;
  }
  throw new Error(`Invalid content for ${type}`);
 }

 async prepareStickerContent(content, options) {
  const { data, mime } = await this.client.getFile(content);
  if (mime === 'image/webp') {
   const buff = await writeExifWebp(data, options);
   return buff;
  }
  throw new Error('Unsupported sticker format');
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

  return this.client.sendMessage(jid, forwardContent, forwardOptions);
 }

 async detectType(content) {
  if (typeof content === 'string') {
   if (isUrl(content)) {
    const response = await fetch(content, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    return 'document';
   }
   return 'text';
  }
  if (Buffer.isBuffer(content)) {
   const { mime } = (await fileType.fromBuffer(content)) || {};
   if (mime) {
    const [type] = mime.split('/');
    return ['image', 'video', 'audio'].includes(type) ? type : 'document';
   }
  }
  return 'text';
 }

 async forwardMessage(jid, message, options = {}) {
  if (!message || !message.message) {
   throw new Error('Invalid message format for forwarding');
  }
  const m = generateWAMessageFromContent(jid, message, {
   ...options,
   userJid: this.client.user.id,
  });
  return this.client.sendMessage(jid, m.message, {
   messageId: m.key.id,
   ...options,
  });
 }
}

module.exports = Message;
