const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const { SESSION_ID: CONFIG_SESSION_ID } = require('../config');

const getSessionId = () => (process.env.SESSION_ID || CONFIG_SESSION_ID || '').replace(/^Session~/, '');

const createSession = async () => {
  const sessionId = getSessionId();
  if (!sessionId) return 'Session ID is empty';

  const sessionUrl = `https://session-manager-x9wf.onrender.com/download/${sessionId}`;
  const zipFilePath = path.resolve(__dirname, `session_${sessionId}.zip`);
  const outputDir = path.resolve(__dirname, '../auth');

  try {
    await fs.ensureDir(outputDir);
    const { data } = await axios.get(sessionUrl, { responseType: 'stream' });
    await new Promise((resolve, reject) =>
      data.pipe(fs.createWriteStream(zipFilePath)).on('finish', resolve).on('error', reject)
    );

    await unzipper.Open.file(zipFilePath).then(dir => dir.extract({ path: outputDir }));
    await fs.remove(zipFilePath);
    console.log('Session initialized successfully');
  } catch (error) {
    return error.response?.status === 404 ? 'Session has expired' : 'Invalid Session ID';
  }
};

module.exports = createSession;