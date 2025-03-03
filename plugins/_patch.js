const { bot } = require('../utils');
bot(
 {
  on: 'text',
  fromMe: true,
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  const content = message.text;
  if (!content) return;
  if (!(content.startsWith('>') || content.startsWith('$') || content.startsWith('|'))) return;

  const evalCmd = content.slice(1).trim();

  try {
   let result;
   const func = new Function('message', 'match', 'm', 'client', `return (async () => { return ${evalCmd}; })();`);
   result = await func(message, match, m, client);
   if (result === undefined) {
    if (evalCmd === 'message') result = message;
    if (evalCmd === 'client') result = client;
    if (evalCmd === 'm') result = m;
   }
   if (typeof result === 'function') {
    result = result.toString();
   } else if (typeof result === 'object' && result !== null) {
    result = require('util').inspect(result, { depth: 2 });
   } else {
    result = result?.toString();
   }

   await message.reply(result || 'No result');
  } catch (error) {
   await message.reply(`Error: ${error.message}`);
  }
 }
);
