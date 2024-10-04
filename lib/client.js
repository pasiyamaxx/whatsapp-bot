const pino = require('pino');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('baileys');
const { PausedChats } = require('../database');
const config = require('../config');
const { serialize } = require('./serialize');
const { Greetings, commands } = require('../utils');
const { Message } = require('../client');
const { loadMessage, saveMessage, saveChat, getName } = require('../database').Store;
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const connect = async () => {
const sessionDir = path.join(__dirname, '../session');
const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
const conn = makeWASocket({
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
logger: logger.child({ module: 'baileys' }),
browser: Browsers.ubuntu('Firefox'),
emitOwnEvents: true,
generateHighQualityLinkPreview: true,
getMessage: async (key) => (await loadMessage(key.id))?.message || { conversation: null },
});
const handleConnection = async ({ connection, lastDisconnect }) => {
if (connection === 'open') {
const msg = `FX-BOT ${require('../package.json').version}\nPrefix: ${config.HANDLERS.replace(/[\[\]]/g, '')}\nPlugins: ${commands.length}\nMode: ${config.WORK_TYPE}`;
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

for (const cmd of commands) {
const priv = msg.dev || msg.isOwner || msg.sudo;
const canExec = config.WORK_TYPE === 'private' ? priv : config.WORK_TYPE === 'public' ? !cmd.fromMe || priv : false;

const exec = (I, args) => cmd.function(new I(conn, msg), ...args, msg, conn, messages[0]);

if (cmd.on) {
const handlers = {
text: () => msg.body && exec(Message, [msg.body]),
delete: () => {
if (msg.type === 'protocolMessage') {
const wa = new Message(conn, msg);
wa.messageId = msg.message.protocolMessage.key?.id;
cmd.function(wa, msg, conn, messages[0]);
}
},
};
handlers[cmd.on]?.();
}

if (canExec && msg.body && cmd.pattern) {
const m = msg.body.match(cmd.pattern);
if (m) {
msg.prefix = m[1];
msg.command = m[1] + m[2];
exec(Message, [m[3] || false]);
break;
}
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
if (msg.sender === conn.user?.id) return;
const name = await getName(msg.sender);
const isGroup = msg.from?.endsWith('@g.us');
const chat = isGroup ? (await conn.groupMetadata(msg.from).catch(() => ({}))).subject : '';
const body = msg.body;
if (name && body && (isGroup ? chat : true)) {
console.log(chat ? `${chat}:\n${name}: ${body}` : `${name}: ${body}`);
}
};
module.exports = { connect };
