const path = require('path');
const axios = require('axios');
const { TIME_ZONE, BOT_INFO } = require('../config');
const { exec } = require('child_process');
const { bot, tiny, runtime, commands, getOS, getRAMUsage, PluginDB, installPlugin, getBuffer, localBuffer } = require('../utils');

bot(
 {
  pattern: 'ping',
  fromMe: false,
  desc: 'Bot response in milliseconds.',
  type: 'system',
 },
 async (message, match, m, client) => {
  let wa = {
   key: { fromMe: false, participant: `0@s.whatsapp.net`, remoteJid: 'status@broadcast' },
   message: {
    contactMessage: {
     displayName: `FX-BOT`,
     vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:'FX-BOT'\nitem1.TEL;waid=${message.sender.split('@')[0]}:${message.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
    },
   },
  };
  const start = new Date().getTime();
  const pingMsg = await message.reply(message.chat, { text: 'Pinging...' }, { quoted: wa });
  const end = new Date().getTime();
  const responseTime = (end - start) / 1000;
  await pingMsg.edit(`*speed ${responseTime} secs*`, { quoted: wa });
 }
);

bot(
 {
  pattern: 'menu',
  fromMe: false,
  description: 'Show All Commands',
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  const { prefix, pushName } = message;
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
    menuText += `\n*${category}*:\n${categorized[category].sort().join(', ')}\n`;
   });
  return client.sendMessage(message.jid, { text: menuText });
 }
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
 }
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
  pattern: 'install',
  fromMe: true,
  desc: 'Installs External plugins',
  type: 'system',
 },
 async (message, match, m, client) => {
  if (!match) return message.reply('_Provide Plugin URl_');
  let url = new URL(match);
  if (url.host === 'gist.github.com') url = `https://gist.githubusercontent.com${url.pathname}/raw`;
  const { data } = await axios.get(url);
  const plugin_name = data.match(/(?<=pattern:) ["'](.*?)["']/)?.[1]?.split(' ')?.[0] || `__${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(`${__dirname}/${plugin_name}.js`, data);
  require(`./${plugin_name}`);
  await installPlugin(url, plugin_name);
  message.send(`_Installed: ${plugin_name}_`);
 }
);

bot(
 {
  pattern: 'plugin',
  fromMe: true,
  desc: 'plugin list',
  type: 'system',
 },
 async (message, match, m, client) => {
  const plugins = await PluginDB.findAll();
  if (plugins.length < 1) return message.send('_External Plugins Not Found_');
  message.send(plugins.map((p) => `\`\`\`${p.dataValues.name}\`\`\`: ${p.dataValues.url}`).join('\n'));
 }
);

bot(
 {
  pattern: 'remove',
  fromMe: true,
  desc: 'Remove external plugins',
  type: 'system',
 },
 async (message, match, m, client) => {
  if (!match) return message.sendMessage('_Need a plugin name_');
  const plugin = await PluginDB.findOne({ where: { name: match } });
  if (!plugin) return message.sendMessage('_Plugin not found_');
  await plugin.destroy();
  delete require.cache[require.resolve(`./${match}.js`)];
  fs.unlinkSync(`${__dirname}/${match}.js`);
  message.sendMessage(`Plugin ${match} deleted`);
 }
);
