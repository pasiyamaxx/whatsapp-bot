const util = require('util');
const { bot, getJson, getBuffer, localBuffer, fetchJson } = require('../utils');
const { exec } = require('child_process');

bot({ on: 'text', fromMe: false, dontAddCommandList: true }, async (message, match, m, client) => {
 const content = message.text
  ?.replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
  .replace(/\n\s*\n/g, '\n')
  .replace(/\s+/g, ' ')
  .trim();

 if (!content || !/^[$>^]/.test(content)) return;

 const evalCmd = content.slice(1).trim();
 const scope = { message, m, client, match, getJson, getBuffer, exec, fetchJson, localBuffer };

 try {
  const isReference = evalCmd.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*$/);

  const evalFunction = new Function(
   ...Object.keys(scope),
   `
        return (async () => {
            ${isReference ? `return ${evalCmd};` : evalCmd};
        })();
      `,
  )(...Object.values(scope));

  const result = await evalFunction;
  const replyMessage = util.inspect(result, { depth: 5 }).toString();
  return await message.reply(replyMessage);
 } catch (error) {
  return await message.reply(`Error: ${error.message}`);
 }
});
