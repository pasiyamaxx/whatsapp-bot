const Base = require('./base');
const fs = require('fs').promises;
const fileType = require('file-type');
const config = require('../config');
const { parsedJid } = require('../utils');
const path = require('path');
const os = require('os');

class ReplyMessage extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  const { key, stanzaId, participant, quotedMessage } = data;
  this.key = key;
  this.id = stanzaId;
  this.isBaileys = (this.id && this.id.startsWith('BAE5')) || (this.id && this.id.length === 16);
  this.jid = participant;
  this.sudo = config.SUDO.split(',').includes(this.jid.split('@')[0]);
  this.fromMe = parsedJid(this.client.user.jid)[0] === parsedJid(this.jid)[0];

  if (quotedMessage) this.processQuotedMessage(quotedMessage);

  return super._patch(data);
 }

 processQuotedMessage(quotedMessage) {
  const [type] = Object.keys(quotedMessage);
  const message = quotedMessage[type];

  if (['extendedTextMessage', 'conversation'].includes(type)) {
   this.text = message.text || message;
   this.mimetype = 'text/plain';
  } else if (type === 'stickerMessage') {
   this.mimetype = 'image/webp';
   this.sticker = message;
  } else {
   this.mimetype = message?.mimetype || type;
   const [mime] = this.mimetype.split('/');
   this[mime] = message;
  }
 }

 async edit(text, opt = {}) {
  return this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
 }

 async downloadMediaMessage() {
  const buff = await this.m.quoted.download();
  const { ext } = await fileType.fromBuffer(buff);
  const filePath = path.join(os.tmpdir(), `downloaded_media${ext}`);
  await fs.writeFile(filePath, buff);
  return filePath;
 }
 async downloadAndSaveMedia() {
  const filePath = await this.m.quoted.copyNSave();
  console.log(filePath);
  return filePath;
 }
}

module.exports = ReplyMessage;
