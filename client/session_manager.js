const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const { Open } = require('unzipper');
const config = require('../config');
const fs = require('fs');

class SessionManager {
 constructor() {
  this.id = config.SESSION_ID.replace(/^Session~/, '').trim();
  if (!this.id) {
   throw new Error('Session ID is empty');
  }
  this.zipPath = join(__dirname, `session_${this.id}.zip`);
  this.dirPath = join(__dirname, '../session');
 }

 async createSession() {
  await ensureDir(this.dirPath);
  await this.downloadSession();
  await this.extractSession();
  await this.cleanup();
  console.log('Session initialized');
 }

 async downloadSession() {
  return new Promise((resolve, reject) => {
   get(`https://session-manager-x9wf.onrender.com/download/${this.id}`, { responseType: 'stream' })
    .then(({ data }) => {
     const writeStream = createWriteStream(this.zipPath);
     data.pipe(writeStream);
     writeStream.on('finish', resolve);
     writeStream.on('error', reject);
    })
    .catch(reject);
  });
 }

 async extractSession() {
  const directoryEntries = await Open.file(this.zipPath);
  const files = await directoryEntries.list();
  for (const file of files) {
   const outputPath = join(this.dirPath, file.path);
   if (file.type === 'File') {
    const existingFilePath = join(this.dirPath, file.path);
    if (fs.existsSync(existingFilePath)) {
     const writeStream = createWriteStream(existingFilePath);
     await new Promise((resolve, reject) => {
      file.stream().pipe(writeStream).on('finish', resolve).on('error', reject);
     });
    } else {
     const writeStream = createWriteStream(outputPath);
     await new Promise((resolve, reject) => {
      file.stream().pipe(writeStream).on('finish', resolve).on('error', reject);
     });
    }
   }
  }
 }

 async cleanup() {
  await remove(this.zipPath);
 }
}

module.exports = SessionManager;
