const os = require('os');
const util = require('util');
const { bot, tiny, runtime, commands, getJson, getBuffer, localBuffer } = require('../utils');
const { TIME_ZONE } = require('../config');
const { exec } = require('child_process');
const fetchJson = getJson;

function getRAMUsage() {
 const totalMemory = os.totalmem();
 const freeMemory = os.freemem();
 const usedMemory = totalMemory - freeMemory;
 return `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getOS() {
 const osType = os.type();
 switch (osType) {
  case 'Linux':
   return 'Linux';
  case 'Darwin':
   return 'MacOS';
  case 'Windows_NT':
   return 'Windows';
  default:
   return 'VPS';
 }
}

bot(
 {
  pattern: 'menu',
  fromMe: false,
  description: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message) => {
  const { prefix, pushName, jid } = message;
  const currentTime = new Date().toLocaleTimeString('en-IN', { timeZone: TIME_ZONE });
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: TIME_ZONE });
  let menuText = `\`\`\`╭─ ғxᴏᴘʀɪsᴀ ᴍᴅ ───
│ Prefix: ${prefix}
│ User: ${pushName}
│ Os: ${getOS()}
│ Plugins: ${commands.length}
│ Runtime: ${runtime(process.uptime())}
│ Ram: ${getRAMUsage()}
│ Time: ${currentTime}
│ Day: ${currentDay}
│ Date: ${currentDate}
│ Version: ${require('../package.json').version}
╰────────────────\`\`\`\n`;

  const categorized = commands
   .filter((cmd) => cmd.pattern && !cmd.dontAddCommandList)
   .map((cmd) => ({
    name: cmd.pattern.toString().split(/\W+/)[2],
    category: cmd.type?.toLowerCase() || 'misc',
   }))
   .reduce((acc, { name, category }) => {
    acc[category] = (acc[category] || []).concat(name);
    return acc;
   }, {});

  Object.keys(categorized)
   .sort()
   .forEach((category) => {
    menuText += tiny(`\n╭── *${category}* ────\n│ ${categorized[category].sort().join('\n│ ')}\n╰──────────────\n`);
   });

  return await message.send(menuText);
 },
);

bot(
 {
  pattern: 'list',
  fromMe: false,
  description: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message) => {
  let commandListText = '\t\t```Command List```\n';
  const commandList = [];

  commands.forEach((command) => {
   if (command.pattern && !command.dontAddCommandList) {
    const commandName = command.pattern.toString().split(/\W+/)[2];
    const description = command.desc || command.info || 'No description available';
    commandList.push({ name: commandName, description });
   }
  });

  commandList.sort((a, b) => a.name.localeCompare(b.name));
  commandList.forEach(({ name, description }, index) => {
   commandListText += `\`\`\`${index + 1} ${name.trim()}\`\`\`\n`;
   commandListText += `Use: \`\`\`${description}\`\`\`\n\n`;
  });

  return await message.sendMessage(message.jid, commandListText.trim());
 },
);

bot(
 {
  pattern: 'restart',
  fromMe: true,
  info: 'Restarts the Bot',
  type: 'system',
 },
 async (message, match, m, client) => {
  await message.sendReply('_Restarting..._');
  await process.exit(1);
 },
);

bot(
 {
  pattern: 'shutdown',
  fromMe: true,
  info: 'Shutdown the bot',
  type: 'system',
 },
 async (m) => {
  await m.sendReply('_Shutting Down_');
  await exec(require('../package.json').scripts.stop);
 },
);

bot(
 {
  pattern: 'ping',
  fromMe: false,
  desc: 'Bot response in milliseconds.',
  type: 'system',
 },
 async (message) => {
  const start = new Date().getTime();
  const msg = await message.reply('');
  const end = new Date().getTime();
  const responseTime = (end - start) / 1000;
  await msg.edit(`*ʟᴀᴛᴇɴᴄʏ: ${responseTime} sᴇᴄs*`);
 },
);

bot(
 {
  pattern: 'runtime',
  fromMe: false,
  desc: 'Check uptime of bot',
  type: 'system',
 },
 async (message, match) => {
  message.send(`*Uptime:* ${runtime(process.uptime())}`);
 },
);

const errorTracker = new Set();

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

  // Unique identifier for the message to track errors
  const messageId = message.id;

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
    localBuffer,
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
   // Clear error tracking if successful
   errorTracker.delete(messageId);
  } catch (error) {
   // Only reply if the error has not been reported for this message
   if (!errorTracker.has(messageId)) {
    errorTracker.add(messageId);
    return await message.reply(`> *Error: ${error.message}*`);
   }
  }
 },
);
