const pino = require('pino');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const { PausedChats } = require('./Store');
const config = require('../config');
const { serialize } = require('./serialize');
const { Greetings } = require('./Utils');
const Message = require('./Client/Message');
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

  for (const command of plugins.commands) {
   const isPrivilegedUser = msg.dev || msg.isOwner || msg.sudo;

   const canExecute = () => {
    if (config.WORK_TYPE === 'private') {
     return isPrivilegedUser;
    } else if (config.WORK_TYPE === 'public') {
     return !command.fromMe || isPrivilegedUser;
    }
    return false;
   };

   if (!canExecute()) continue;

   const executeCommand = (Instance, args) => {
    const whats = new Instance(conn, msg);
    command.function(whats, ...args, msg, conn, messages[0]);
   };

   if (msg.body && command.pattern) {
    const match = msg.body.match(command.pattern);
    if (match) {
     msg.prefix = match[1];
     msg.command = [match[1], match[2]].join('');
     executeCommand(Message, [match[3] || false]);
     break;
    }
   } else if (command.on) {
    const commandHandlers = {
     text: () => msg.body && executeCommand(Message, [msg.body]),
     delete: () => {
      if (msg.type === 'protocolMessage') {
       const whats = new Message(conn, msg);
       whats.messageId = msg.message.protocolMessage.key?.id;
       command.function(whats, msg, conn, messages[0]);
      }
     },
    };
    commandHandlers[command.on]?.();
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
