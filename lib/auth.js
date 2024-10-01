const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');

const makeSession = async (accessKey) => {
 const url = `https://session-manager-x9wf.onrender.com/download/${accessKey}`;
 const sessionZip = path.join(__dirname, `session_${accessKey}.zip`);
 const sessionDir = path.join(__dirname, '../auth');
 await fs.ensureDir(sessionDir);
 const response = await axios.get(url, { responseType: 'stream' });
 const writer = fs.createWriteStream(sessionZip);
 response.data.pipe(writer);
 await new Promise((resolve, reject) => {
  writer.on('finish', () => {
   resolve();
  });
  writer.on('error', (err) => {
   reject(err);
  });
 });
 await fs
  .createReadStream(sessionZip)
  .pipe(unzipper.Extract({ path: sessionDir }))
  .promise();

 console.log(`session initalized`);
 await fs.remove(sessionZip);
};
module.exports = { makeSession };
