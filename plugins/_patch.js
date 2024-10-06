const util = require('util');
const { bot } = require('../utils');

bot(
 {
  on: 'text',
  fromMe: true,
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  const content = message.text?.trim();
  if (!content) return;

  if (!content.startsWith('>') && !content.startsWith('$') && !content.startsWith('^')) return;

  const evalCmd = content.slice(1).trim();

  try {
   const result = await eval(`(async () => { ${evalCmd} })()`);
   let replyMessage;

   if (result === undefined) {
    replyMessage = 'No result';
   } else if (typeof result === 'object') {
    replyMessage = util.inspect(result, { depth: 1, colors: false });
   } else {
    replyMessage = result.toString();
   }

   await message.reply(replyMessage);
  } catch (error) {
   await message.reply(`Error: ${error.message}`);
  }
 }
);
