const Base = require('./base');
const config = require('../config');
const ReplyMessage = require('./message_reply');
const GroupManager = require('./group_manager');
const UserProfileManager = require('./chats_manager');
const { decodeJid, createInteractiveMessage, parsedJid, writeExifWebp } = require('../utils');
const { generateWAMessageFromContent, generateWAMessage, generateForwardMessageContent, getContentType } = require('baileys');

class Message extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
  this.groupManager = new GroupManager(this.client, data);
  this.chatManager = new UserProfileManager(this.client, data);
  return new Proxy(this, {
   get: (target, prop) => {
    if (typeof target.groupManager[prop] === 'function') return (...args) => target.groupManager[prop](...args);
    if (typeof target.chatManager[prop] === 'function') return (...args) => target.chatManager[prop](...args);
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
   reply_message: quoted && !message.buttonsResponseMessage ? new ReplyMessage(this.client, contextInfo, quoted) : false,
   sticker: Boolean(message.stickerMessage),
   video: message.videoMessage,
   image: message.imageMessage,
  });

  return super._patch(data);
 }

 async sendMessage(jid, content, opt = {}, type = 'text') {
  const sendFunctions = {
   text: () => this.client.sendMessage(jid || this.jid, { text: content, ...opt }),
   image: () => this.sendMedia('image', content, opt),
   video: () => this.sendMedia('video', content, opt),
   audio: () => this.sendMedia('audio', content, opt),
   template: async () => {
    const msg = await generateWAMessage(jid || this.jid, content, opt);
    return this.client.relayMessage(jid || this.jid, { viewOnceMessage: { message: { ...msg.message } } }, { messageId: msg.key.id });
   },
   interactive: async () => {
    const msg = createInteractiveMessage(content);
    return this.client.relayMessage(jid || this.jid, msg.message, { messageId: msg.key.id });
   },
   sticker: async () => {
    const { data, mime } = await this.client.getFile(content);
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(data, opt);
     return this.client.sendMessage(jid || this.jid, { sticker: { url: buff }, ...opt }, opt);
    }
    return this.client.sendImageAsSticker(this.jid, content, opt);
   },
   document: () => this.sendMedia('document', content, { ...opt, mimetype: opt.mimetype || 'application/octet-stream' }),
   pdf: () => this.sendMedia('document', content, { ...opt, mimetype: 'application/pdf' }),
  };

  const sendFunc = sendFunctions[type.toLowerCase()];
  if (!sendFunc) throw new Error('Unsupported message type');
  return sendFunc();
 }

 async sendMedia(type, content, opt = {}) {
  const mediaContent = Buffer.isBuffer(content) ? content : typeof content === 'string' && content.startsWith('http') ? { url: content } : content;
  return this.client.sendMessage(opt.jid || this.jid, { [type]: mediaContent, ...opt });
 }

 async reply(text, options = {}) {
  const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options });
  return new Message(this.client, message);
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key }, opt);
 }

 async react(emoji) {
  return this.client.sendMessage(this.jid, { react: { text: emoji, key: this.key } });
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
}

module.exports = Message;
