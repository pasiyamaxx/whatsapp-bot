const { bot, PluginDB, installPlugin } = require('../lib');
const axios = require('axios');
const fs = require('fs');

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
