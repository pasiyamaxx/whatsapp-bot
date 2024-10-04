const { Sequelize } = require('sequelize');
require('dotenv').config();
const toBool = (x) => x === 'true';
const DATABASE_URL = process.env.DATABASE_URL || './database.db';

module.exports = {
 BOT_INFO: process.env.BOT_INFO || 'Astro,fxop;https://myimage.jpg',
 LOGS: toBool(process.env.LOGS) || true,
 SESSION_ID: (process.env.SESSION_ID || '').trim(),
 SUDO: process.env.SUDO || '',
 HANDLERS: process.env.HANDLER === 'false' || process.env.HANDLER === 'null' ? '^' : '[.]',
 RMBG_KEY: process.env.RMBG_KEY || '',
 BRANCH: 'master',
 WARN_COUNT: 3,
 AUTHOR: process.env.AUTHOR || 'AstroX10',
 PACKNAME: process.env.PACKNAME || 'fxoprisa-md',
 WELCOME_MSG: process.env.WELCOME_MSG || 'Hi @user Welcome to @gname',
 GOODBYE_MSG: process.env.GOODBYE_MSG || '@user It was Nice Seeing you',
 AUTO_READ: toBool(process.env.AUTO_READ) || false,
 AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ) || false,
 DELETED_LOG: toBool(process.env.DELETED_LOG) || false,
 DELETED_LOG_CHAT: process.env.DELETED_LOG_CHAT || false,
 TIME_ZONE: process.env.TZ || 'Africa/Lagos',
 WORK_TYPE: process.env.WORK_TYPE || 'private',
 DATABASE_URL: DATABASE_URL,
 DATABASE:
  DATABASE_URL === './database.db'
   ? new Sequelize({
      dialect: 'sqlite',
      storage: DATABASE_URL,
      logging: false,
     })
   : new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      ssl: true,
      protocol: 'postgres',
      dialectOptions: {
       native: true,
       ssl: { require: true, rejectUnauthorized: false },
      },
      logging: false,
     }),
};