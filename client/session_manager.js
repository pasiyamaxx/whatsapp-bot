const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const { Open } = require('unzipper');
const config = require('../config');

class SessionManager {
  constructor() {
    this.id = config.SESSION_ID.replace(/^Session~/, '').trim();
    if (!this.id) {
      throw new Error('Session ID is empty');
    }
    this.zipPath = join(__dirname, `session_${this.id}.zip`);
    this.dirPath = join(__dirname, './session');
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
    await (await Open.file(this.zipPath)).extract({ path: this.dirPath });
  }

  async cleanup() {
    await remove(this.zipPath);
  }
}

module.exports=SessionManager