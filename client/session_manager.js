const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const unzipper = require('unzipper'); // Ensure you have this imported
const config = require('../config');

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
  return new Promise((resolve, reject) => {
   fs
    .createReadStream(this.zipPath)
    .pipe(unzipper.Parse())
    .on('entry', async (entry) => {
     const outputPath = join(this.dirPath, entry.path);
     const writeStream = createWriteStream(outputPath);
     entry
      .pipe(writeStream)
      .on('finish', () => {
       console.log(`Extracted: ${outputPath}`);
      })
      .on('error', (error) => {
       console.error(`Failed to extract ${entry.path}:`, error);
       reject(error);
      });
    })
    .on('close', resolve)
    .on('error', reject);
  });
 }

 async cleanup() {
  await remove(this.zipPath);
 }
}

module.exports = SessionManager;
