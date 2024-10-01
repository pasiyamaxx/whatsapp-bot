const os = require('os');
const util = require('util');
const { bot, Mode, runtime, commands, getJson, getBuffer } = require('../lib');
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
  let menuText = `╭─ ғxᴏᴘʀɪsᴀ ᴍᴅ ───
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
╰────────────────\n`;

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
    menuText += `\n╭── ${category} ────\n│ ${categorized[category].sort().join('\n│ ')}\n╰──────────────\n`;
   });

  return await message.sendMessage(jid, '```' + menuText.trim() + '```');
 }
);

bot(
 {
  pattern: 'list',
  fromMe: false,
  description: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message, query, { prefix }) => {
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
 }
);

bot(
 {
  pattern: 'reboot',
  fromMe: true,
  info: 'Restarts the Bot',
  type: 'system',
 },
 async (message, match, m, client) => {
  await message.sendReply('_Restarting..._');
  await process.exit(1);
 }
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
 }
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
  await msg.edit(`ʟᴀᴛᴇɴᴄʏ: ${responseTime} sᴇᴄs`);
 }
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
 }
);

bot(
 {
  on: 'text',
  fromMe: true,
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  const content = message.text;
  if (!content) return;
  if (!(content.startsWith('>') || content.startsWith('$') || content.startsWith('^'))) return;

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

   if (result === undefined) {
    await message.reply('No result');
   } else if (typeof result === 'function') {
    await message.reply(result.toString());
   } else if (typeof result === 'object') {
    await message.reply(util.inspect(result, { depth: 2, colors: true }) || 'No result');
   } else {
    await message.reply(result.toString());
   }
  } catch (error) {
   await message.reply(`Error: ${error.message}`);
  }
 }
);
