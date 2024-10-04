const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const { Open } = require('unzipper');
const config = require('../config');

const createSession = async () => {
 const id = config.SESSION_ID.replace(/^Session~/, '').trim();
 if (!id) return console.log('Session ID is empty');

 const zip = join(__dirname, `session_${id}.zip`),
  dir = join(__dirname, '../auth');
 await ensureDir(dir);
 await new Promise((res) => get(`https://session-manager-x9wf.onrender.com/download/${id}`, { responseType: 'stream' }).then(({ data }) => data.pipe(createWriteStream(zip)).on('finish', res)));
 await (await Open.file(zip)).extract({ path: dir });
 await remove(zip);
 return console.log('session initialized');
};

module.exports = createSession;
