const pino = require('pino');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const { PausedChats } = require('./Store');
const config = require('../config');
const { serialize } = require('./serialize');
const { Greetings } = require('./Utils');
const { Image, Message, Sticker, Video, AllMessage } = require('./Client');
const { loadMessage, saveMessage, saveChat, getName } = require('./Store').Store;
const plugins = require('./Utils');
const createSession = require('./auth');
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const connect = async () => {
 await createSession();
 const sessionDir = path.join(__dirname, '../auth');
 const { version, isLatest } = await fetchLatestBaileysVersion();
 const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
 const conn = makeWASocket({
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
  logger: logger.child({ module: 'baileys' }),
  browser: Browsers.ubuntu('Firefox'),
  downloadHistory: true,
  markOnlineOnConnect: true,
  emitOwnEvents: true,
  version,
  generateHighQualityLinkPreview: true,
  getMessage: async (key) => (await loadMessage(key.id))?.message || { conversation: null },
 });
 const handleConnection = async ({ connection, lastDisconnect }) => {
  if (connection === 'open') {
   const msg = `FX-BOT ${require('../package.json').version}\nPrefix: ${config.HANDLERS.replace(/[\[\]]/g, '')}\nPlugins: ${plugins.commands.length}\nMode: ${config.WORK_TYPE}`;
   console.log('Connected\n' + msg);
   return conn.sendMessage(conn.user.id, { text: '```' + msg + '```' });
  }
  if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) await delay(10000), connect();
 };

 const handleMessages = async ({ messages }) => {
  const msg = await serialize(JSON.parse(JSON.stringify(messages[0])), conn);
  await saveMessage(messages[0], msg.sender);
  if (config.AUTO_READ) await conn.readMessages([msg.key]);
  if (config.AUTO_STATUS_READ && msg.from === 'status@broadcast') await conn.readMessages([msg.key]);

  const isResume = new RegExp(`${config.HANDLERS}( ?resume)`, 'is').test(msg.body);
  const pausedChats = await PausedChats.getPausedChats();
  if (pausedChats.some((chat) => chat.chatId === msg.from && !isResume)) return;

  if (config.LOGS) await logMessage(msg, conn);

  const executeCommand = (Instance, command, args) => command.function(new Instance(conn, msg), ...args, msg, conn, messages[0]);

  const canExecuteCommand = (command) => {
   if (command.on === 'text' || command.on === 'message') {
    return true;
   }
   return config.WORK_TYPE === 'public' ? !command.fromMe || msg.fromMe || msg.sudo || msg.devs : config.WORK_TYPE === 'private' ? msg.botDev || msg.fromMe || msg.sudo || msg.devs : false;
  };

  for (const command of plugins.commands) {
   if (!canExecuteCommand(command)) continue;

   if (msg.body && command.pattern) {
    const match = msg.body.match(command.pattern);
    if (match) {
     [, msg.prefix, msg.command] = match;
     msg.command = msg.prefix + match[2];
     executeCommand(Message, command, [match[3] || false]);
     break;
    }
   } else if (command.on) {
    const handlers = {
     text: () => msg.body && executeCommand(Message, command, [msg.body]),
     image: () => msg.type === 'imageMessage' && executeCommand(Image, command, [msg.body]),
     sticker: () => msg.type === 'stickerMessage' && executeCommand(Sticker, command, []),
     video: () => msg.type === 'videoMessage' && executeCommand(Video, command, []),
     delete: () => msg.type === 'protocolMessage' && command.function(Object.assign(new Message(conn, msg), { messageId: msg.message.protocolMessage.key?.id }), msg, conn, messages[0]),
     message: () => executeCommand(AllMessage, command, []),
    };
    handlers[command.on]?.();
   }
  }
 };

 conn.ev.on('connection.update', handleConnection);
 conn.ev.on('creds.update', saveCreds);
 conn.ev.on('group-participants.update', (data) => Greetings(data, conn));
 conn.ev.on('chats.update', (chats) => Promise.all(chats.map(saveChat)));
 conn.ev.on('messages.upsert', handleMessages);

 process.on('unhandledRejection', (err) => handleErrors(err, conn));
 process.on('uncaughtException', (err) => handleErrors(err, conn));

 return conn;
};

const handleErrors = async (err, conn, msg = {}) => {
 const { message, stack } = err;
 const fileName = stack?.split('\n')[1]?.trim();
 const errorText = `─━❲ ERROR REPORT ❳━─\nMessage: ${message}\nFrom: ${fileName}`;
 await conn.sendMessage(conn.user.id, { text: '```' + errorText + '```' });
};

const logMessage = async (msg, conn) => {
 const botId = conn.user.id;
 if (msg.sender === botId) return;
 const name = await getName(msg.sender);
 const chat = msg.from.endsWith('@g.us') ? (await conn.groupMetadata(msg.from)).subject : '';
 console.log(chat ? `${chat}:\n${name}: ${msg.body}` : `${name}: ${msg.body}`);
};
module.exports = { connect };
