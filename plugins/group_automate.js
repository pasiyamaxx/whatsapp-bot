const { bot } = require('../lib');

class AntilinkDB {
 constructor() {
  this.db = new Map();
 }

 setAntilink(jid, settings) {
  this.db.set(jid, settings);
 }

 getAntilink(jid) {
  return this.db.get(jid) || null;
 }

 deleteAntilink(jid) {
  this.db.delete(jid);
 }

 incrementWarn(jid, userJid) {
  const settings = this.getAntilink(jid);
  if (settings && settings.warn) {
   if (!settings.warnCount) settings.warnCount = {};
   settings.warnCount[userJid] = (settings.warnCount[userJid] || 0) + 1;
   this.setAntilink(jid, settings);
   return settings.warnCount[userJid];
  }
  return 0;
 }
}

const antilinkDB = new AntilinkDB();

// Define an async isAdmin function to check if a user is an admin
const isAdmin = async (jid, message, client) => {
 try {
  const metadata = await client.groupMetadata(message.jid);
  const participant = metadata.participants.find((p) => p.id === jid);
  return participant ? participant.admin : false;
 } catch (error) {
  console.error('Error fetching group metadata:', error);
  return false;
 }
};

bot(
 {
  pattern: 'antilink ?(.*)',
  fromMe: true,
  desc: 'Set AntiLink on | off',
  type: 'group manage',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('This command is only for groups.');
  if (!(await isAdmin(message.user, message, client))) return await message.reply("I'm not an admin in this group.");

  const command = match.trim().toLowerCase();
  const settings = antilinkDB.getAntilink(message.jid) || { active: false };

  switch (command) {
   case 'on':
    settings.active = true;
    antilinkDB.setAntilink(message.jid, settings);
    await message.reply('Antilink has been turned on for this group.');
    break;

   case 'off':
    settings.active = false;
    antilinkDB.setAntilink(message.jid, settings);
    await message.reply('Antilink has been turned off for this group.');
    break;

   case 'delete':
    settings.delete = true;
    settings.kick = false;
    settings.warn = false;
    antilinkDB.setAntilink(message.jid, settings);
    await message.reply('Antilink set to delete messages with links.');
    break;

   case 'kick':
    settings.delete = true;
    settings.kick = true;
    settings.warn = false;
    antilinkDB.setAntilink(message.jid, settings);
    await message.reply('Antilink set to delete messages and kick users who send links.');
    break;

   case 'warn':
    settings.delete = true;
    settings.kick = false;
    settings.warn = true;
    antilinkDB.setAntilink(message.jid, settings);
    await message.reply('Antilink set to delete messages and warn users who send links.');
    break;

   case 'get':
    if (settings.active) {
     let status = 'Antilink is active.\n';
     status += settings.delete ? 'Messages with links will be deleted.\n' : '';
     status += settings.kick ? 'Users sending links will be kicked.\n' : '';
     status += settings.warn ? 'Users sending links will be warned.\n' : '';
     await message.reply(status.trim());
    } else {
     await message.reply('Antilink is currently inactive for this group.');
    }
    break;

   case 'del':
    antilinkDB.deleteAntilink(message.jid);
    await message.reply('Antilink settings have been deleted for this group.');
    break;

   default:
    await message.reply('Invalid command. Use: antilink on/off/delete/kick/warn/get/del');
  }
 }
);

bot(
 {
  on: 'text',
  fromMe: false,
  dontAddCommandList: true,
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return;

  const settings = antilinkDB.getAntilink(message.jid);
  if (!settings || !settings.active) return;
  if (!(await isAdmin(message.user, message, client))) return;
  if (await isAdmin(message.participant, message, client)) return; // Ignore admins

  const linkRegex = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gi;
  const links = message.text.match(linkRegex);

  if (links) {
   if (settings.delete) {
    const messageKey = {
     remoteJid: message.jid,
     fromMe: false,
     id: message.id,
    };
    await client.sendMessage(message.jid, { delete: messageKey });
   }
   if (settings.kick) {
    await client.groupParticipantsUpdate(message.jid, [message.participant], 'remove');
    await message.reply(`@${message.participant.split('@')[0]} has been removed for sending a link.`, { mentions: [message.participant] });
   } else if (settings.warn) {
    const warnCount = antilinkDB.incrementWarn(message.jid, message.participant);
    await message.reply(`@${message.participant.split('@')[0]}, sending links is not allowed. Warning ${warnCount}/3`, { mentions: [message.participant] });

    if (warnCount >= 3) {
     await client.groupParticipantsUpdate(message.jid, [message.participant], 'remove');
     await message.reply(`@${message.participant.split('@')[0]} has been removed for exceeding the warn limit.`, { mentions: [message.participant] });
    }
   } else {
    await message.reply(`@${message.participant.split('@')[0]}, sending links is not allowed in this group.`, { mentions: [message.participant] });
   }
  }
 }
);
