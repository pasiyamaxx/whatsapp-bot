const { bot, isAdmin, parsedJid } = require('../utils');

bot(
 {
  pattern: 'add',
  fromMe: true,
  desc: 'add a person to group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to add');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  const jid = parsedJid(match);
  await client.groupParticipantsUpdate(message.jid, [jid], 'add');
  return await message.reply(`_@${jid[0].split('@')[0]} added_`, { mentions: [jid] });
 }
);

bot(
 {
  pattern: 'kick',
  fromMe: true,
  desc: 'kicks a person from group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to kick_');
  const isadmin = await isAdmin(message.jid, message.user, message.client);
  if (!isadmin) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupParticipantsUpdate(message.jid, [message.participant], 'remove');
  return await message.reply(`_@${message.participant.split('@')[0]} kicked_`, { mentions: [message.participant] });
 }
);

bot(
 {
  pattern: 'promote',
  fromMe: true,
  desc: 'promote to admin',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to promote_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupParticipantsUpdate(message.jid, [message.participant], 'promote');
  return await message.reply(`_@${message.participant[0].split('@')[0]} promoted as admin_`, { mentions: [message.participant] });
 }
);
bot(
 {
  pattern: 'demote',
  fromMe: true,
  desc: 'demote from admin',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to demote_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupParticipantsUpdate(message.jid, [message.participant], 'demote');
  return await message.reply(`_@${message.participant[0].split('@')[0]} demoted from admin_`, { mentions: [message.participant] });
 }
);

bot(
 {
  pattern: 'mute',
  fromMe: true,
  desc: 'nute group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupSettingUpdate(message.jid, 'announcement');
  return await message.reply('_Muted.._');
 }
);

bot(
 {
  pattern: 'unmute',
  fromMe: true,
  desc: 'unmute group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupSettingUpdate(message.jid, 'not_announcement');
  return await message.reply('_Unmuted.._');
 }
);

bot(
 {
  pattern: 'gjid',
  fromMe: true,
  desc: 'gets jid of all group members',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  let { participants } = await client.groupMetadata(message.jid);
  let participant = participants.map((u) => u.id);
  let str = '╭──〔 *Group Jids* 〕\n';
  participant.forEach((result) => {
   str += `├ *${result}*\n`;
  });
  str += `╰──────────────`;
  message.reply(str);
 }
);

bot(
 {
  pattern: 'tagall',
  fromMe: true,
  desc: 'mention all users in group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return;
  const { participants } = await message.client.groupMetadata(message.jid);
  let teks = '';
  for (let mem of participants) teks += ` @${mem.id.split('@')[0]}\n`;
  return await message.sendMessage(message.jid, teks.trim(), { mentions: participants.map((a) => a.id) });
 }
);

bot(
 {
  pattern: 'tag',
  fromMe: true,
  desc: 'mention all users in group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.text;
  if (!match) return message.reply('_Enter or reply to a text to tag_');
  const { participants } = await client.groupMetadata(message.jid);
  message.sendMessage(message.jid, match, { mentions: participants.map((a) => a.id) });
 }
);
