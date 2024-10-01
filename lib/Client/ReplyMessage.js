const Base = require('./Base');
const fs = require('fs').promises;
const fileType = require('file-type');
const config = require('../../config');
const { parsedJid } = require('../Utils');
const path = require('path');
const os = require('os');

class ReplyMessage extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  this.key = data.key;
  this.id = data.stanzaId;
  this.isBaileys = this.id.startsWith('BAE5') || this.id.length === 16;
  this.jid = data.participant;
  this.sudo = this.#isSudo(this.jid);
  this.fromMe = this.#isFromMe(this.jid);

  if (data.quotedMessage) {
   this.#processQuotedMessage(data.quotedMessage);
  }

  return super._patch(data);
 }

 #isSudo(jid) {
  try {
   return config.SUDO.split(',').includes(jid.split('@')[0]);
  } catch {
   return false;
  }
 }

 #isFromMe(jid) {
  return parsedJid(this.client.user.jid)[0] === parsedJid(jid)[0];
 }

 #processQuotedMessage(quotedMessage) {
  const [type] = Object.keys(quotedMessage);

  if (['extendedTextMessage', 'conversation'].includes(type)) {
   this.text = quotedMessage[type].text || quotedMessage[type];
   this.mimetype = 'text/plain';
  } else if (type === 'stickerMessage') {
   this.mimetype = 'image/webp';
   this.sticker = quotedMessage[type];
  } else {
   const mimetype = quotedMessage[type]?.mimetype || type;
   this.mimetype = mimetype;

   if (mimetype.includes('/')) {
    const [mime] = mimetype.split('/');
    this[mime] = quotedMessage[type];
   } else {
    this.message = quotedMessage[type];
   }
  }
 }

 async edit(text, opt = {}) {
  await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
 }

 async downloadMediaMessage() {
  const buff = await this.m.quoted.download();
  const type = await fileType.fromBuffer(buff);
  const filePath = path.join(os.tmpdir(), `downloaded_media${type.ext}`);
  await fs.writeFile(filePath, buff);
  return filePath;
 }
}

module.exports = ReplyMessage;
