const { bot } = require('../utils');
const { getGreetings, setWelcome, setGoodbye } = require('../lib');

const formatMessage = async (message, user, groupName, client) => {
  const groupMetadata = await client.groupMetadata(message.jid);
  const participantCount = groupMetadata.participants.length;
  const adminCount = groupMetadata.participants.filter(p => p.admin).length;

  return message
    .replace('@pp', '') // Placeholder for profile picture, handled separately
    .replace('@user', `@${user.split('@')[0]}`)
    .replace('@gname', groupName)
    .replace('@count', participantCount.toString())
    .replace('@admins', adminCount.toString());
};

bot(
  {
    pattern: 'welcome ?(.*)',
    fromMe: true,
    desc: 'Set welcome message',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('This command is only for groups.');

    const [cmd, ...args] = match.trim().split(' ');
    const welcomeMessage = args.join(' ');

    if (cmd === 'on' || cmd === 'off') {
      const enabled = cmd === 'on';
      await setWelcome(message.jid, null, enabled);
      return message.reply(`Welcome message ${enabled ? 'enabled' : 'disabled'}.`);
    }

    if (!welcomeMessage) {
      const greetings = await getGreetings(message.jid);
      return message.reply(`Current welcome message: ${greetings.welcomeMessage}\nStatus: ${greetings.welcomeEnabled ? 'Enabled' : 'Disabled'}`);
    }

    await setWelcome(message.jid, welcomeMessage, true);
    return message.reply('Welcome message set and enabled.');
  }
);

bot(
  {
    pattern: 'goodbye ?(.*)',
    fromMe: true,
    desc: 'Set goodbye message',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return message.reply('This command is only for groups.');

    const [cmd, ...args] = match.trim().split(' ');
    const goodbyeMessage = args.join(' ');

    if (cmd === 'on' || cmd === 'off') {
      const enabled = cmd === 'on';
      await setGoodbye(message.jid, null, enabled);
      return message.reply(`Goodbye message ${enabled ? 'enabled' : 'disabled'}.`);
    }

    if (!goodbyeMessage) {
      const greetings = await getGreetings(message.jid);
      return message.reply(`Current goodbye message: ${greetings.goodbyeMessage}\nStatus: ${greetings.goodbyeEnabled ? 'Enabled' : 'Disabled'}`);
    }

    await setGoodbye(message.jid, goodbyeMessage, true);
    return message.reply('Goodbye message set and enabled.');
  }
);

bot(
  {
    on: 'group_update',
    fromMe: false,
  },
  async (message, match, m, client) => {
    if (message.action === 'add') {
      const greetings = await getGreetings(message.jid);
      if (greetings.welcomeEnabled) {
        const groupName = message.subject || 'the group';
        const formattedMessage = await formatMessage(greetings.welcomeMessage, message.participants[0], groupName, client);
        await client.sendMessage(message.jid, { text: formattedMessage, mentions: message.participants });
      }
    } else if (message.action === 'remove') {
      const greetings = await getGreetings(message.jid);
      if (greetings.goodbyeEnabled) {
        const groupName = message.subject || 'the group';
        const formattedMessage = await formatMessage(greetings.goodbyeMessage, message.participants[0], groupName, client);
        await client.sendMessage(message.jid, { text: formattedMessage, mentions: message.participants });
      }
    }
  }
);
