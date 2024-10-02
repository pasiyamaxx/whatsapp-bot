const { bot } = require('../lib');

class AFKManager {
 constructor() {
  this.isAfk = false;
  this.reason = null;
  this.lastSeen = 0;
 }

 setAFK(reason = null) {
  this.isAfk = true;
  this.reason = reason;
  this.lastSeen = Math.floor(Date.now() / 1000);
 }

 clearAFK() {
  this.isAfk = false;
  this.reason = null;
  this.lastSeen = 0;
 }

 getAFKMessage() {
  const timePassed = this.lastSeen ? this.secondsToHms(Math.floor(Date.now() / 1000) - this.lastSeen) : '';
  return `I'm currently away from keyboard.${this.reason ? `\n*Reason:* \`\`\`${this.reason}\`\`\`` : ''}${timePassed ? `\n*Last Seen:* \`\`\`${timePassed} ago\`\`\`` : ''}`;
 }

 secondsToHms(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const hDisplay = h > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '';
  const mDisplay = m > 0 ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
  const sDisplay = s > 0 ? `${s} ${s === 1 ? 'second' : 'seconds'}` : '';

  return [hDisplay, mDisplay, sDisplay].filter(Boolean).join(', ');
 }
}

const afkManager = new AFKManager();

bot(
 {
  on: 'text',
  fromMe: false,
 },
 async (message, match) => {
  if (!afkManager.isAfk) return;

  const isRelevantMessage = !message.jid.includes('@g.us') || (message.mention && message.mention.length > 0) || message.reply_message;

  if (!isRelevantMessage) return;

  const shouldRespond = (message.mention && message.mention.includes(message.client.user.jid.split('@')[0])) || (message.reply_message && message.reply_message.jid.split('@')[0] === message.client.user.jid.split('@')[0]);

  if (shouldRespond) {
   await message.send(afkManager.getAFKMessage(), { quoted: message.data });
  }
 }
);

bot(
 {
  on: 'text',
  fromMe: true,
 },
 async (message, match) => {
  if (afkManager.isAfk && !message.id.startsWith('3EB0')) {
   afkManager.clearAFK();
   await message.send("I'm no longer away from keyboard.");
  }
 }
);

bot(
 {
  pattern: 'afk ?(.*)',
  fromMe: true,
  desc: 'Sets your status as away from keyboard (AFK).',
 },
 async (message, match) => {
  if (!afkManager.isAfk) {
   afkManager.setAFK(match || null);
   await message.send(`I'm now away from keyboard.${afkManager.reason ? `\n*Reason:* \`\`\`${afkManager.reason}\`\`\`` : ''}`);
  }
 }
);
