const util = require('util');
const { bot, getJson, getBuffer } = require('../lib');
const { exec } = require('child_process');
const fetchJson = getJson;
bot(
 {
  on: 'text',
  fromMe: false,
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  const content = message.text?.trim();
  if (!content) return;

  const isCommand = content.startsWith('>') || content.startsWith('$') || content.startsWith('^');
  if (!isCommand) return;

  const evalCmd = content.slice(1).trim();

  try {
   const scope = {
    message,
    match,
    m,
    client,
    console,
    require,
    process,
    Buffer,
    fetch,
    Promise,
    getJson,
    getBuffer,
    exec,
    bot,
    fetchJson,
   };
   const asyncEval = new Function(...Object.keys(scope), `return (async () => { return ${evalCmd}; })();`);
   const result = await asyncEval(...Object.values(scope));
   let replyMessage;
   if (result === undefined) {
    replyMessage = 'No result';
   } else if (typeof result === 'function') {
    replyMessage = result.toString();
   } else if (typeof result === 'object' && !Array.isArray(result)) {
    replyMessage = util.inspect(result, { depth: 5, colors: false, showHidden: false });
   } else if (Array.isArray(result)) {
    replyMessage = 'Arrays are not displayed.';
   } else {
    replyMessage = result.toString();
   }
   await message.reply(replyMessage);
  } catch (error) {
   await message.reply(`> *Error: ${error.message}*`);
  }
 }
);
