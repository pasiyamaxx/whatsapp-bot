const { bot } = require('../utils');
const { getAntiLink, setAntiLink, deleteAntiLink } = require('../lib');

const isAdmin = async (jid, message, client) => {
 const metadata = await client.groupMetadata(message.jid).catch(() => null);
 return metadata?.participants.find((p) => p.id === jid)?.admin || false;
};

bot(
 {
  pattern: 'antilink ?(.*)',
  fromMe: true,
  desc: 'Set AntiLink on | off | delete | kick',
  type: 'group',
 },
 async (message, match, client) => {
  if (!message.isGroup) return message.reply('This command is only for groups.');
  if (!(await isAdmin(message.user, message, client))) return message.reply("I'm not an admin.");
  const cmd = match.trim().toLowerCase();
  if (!cmd) {
   const settings = await getAntiLink(message.jid);
   return message.reply(settings ? `AntiLink: ${settings.mode}` : 'AntiLink is off.');
  }
  if (cmd === 'off') {
   await deleteAntiLink(message.jid);
   return message.reply('AntiLink turned off.');
  }
  const mode = ['on', 'delete'].includes(cmd) ? 'delete' : cmd === 'kick' ? 'kick' : null;
  if (!mode) return message.reply('Use: antilink on/off/delete/kick');
  await setAntiLink(message.jid, mode);
  return await message.reply(`AntiLink set to ${mode}.`);
 }
);

bot(
 {
  on: 'text',
  fromMe: false,
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return;
  const settings = await getAntiLink(message.jid);
  if (!settings) return;
  const isUserAdmin = await isAdmin(message.participant, message, client);
  if (isUserAdmin) return;
  const hasLink = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gi.test(message.text);
  if (hasLink) {
   await client.sendMessage(message.jid, { delete: message.key });
   if (settings.mode === 'kick') {
    await client.groupParticipantsUpdate(message.jid, [message.participant], 'remove');
    message.reply(`@${message.participant.split('@')[0]} removed for sending a link.`, { mentions: [message.participant] });
   } else {
    message.reply(`@${message.participant.split('@')[0]}, links are not allowed.`, { mentions: [message.participant] });
   }
  }
 }
);
