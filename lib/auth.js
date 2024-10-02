const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const { SESSION_ID: CONFIG_SESSION_ID } = require('../config');

const getCleanSessionId = () => (process.env.SESSION_ID || CONFIG_SESSION_ID || '').replace(/^Session~/, '');

const createSession = async () => {
 const sessionID = getCleanSessionId();
 if (!sessionID) return 'empty session';

 const url = `https://session-manager-x9wf.onrender.com/download/${sessionID}`;
 const zipPath = path.join(__dirname, `downloaded_${sessionID}.zip`);
 const sessionPath = path.join(__dirname, '../auth');

 try {
  await fs.ensureDir(sessionPath);
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(zipPath);
  response.data.pipe(writer);

  await new Promise((res, rej) => writer.on('finish', res).on('error', rej));
  await unzipper.Open.file(zipPath).then((d) => d.extract({ path: sessionPath }));
  await fs.remove(zipPath);
  console.log('Session connected');
 } catch (err) {
  return err.response?.status === 404 ? 'session expired' : 'invalid session id';
 }
};

module.exports = createSession;
