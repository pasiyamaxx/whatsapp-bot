const { DataTypes } = require('sequelize');
const { DATABASE } = require('../../config');

const Greetings = DATABASE.define('Greetings', {
  groupJid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Welcome @user to @gname! We now have @count members.',
  },
  goodbyeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Goodbye @user from @gname! We now have @count members.',
  },
  welcomeEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  goodbyeEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

const getGreetings = async (groupJid) => {
  const [greetings] = await Greetings.findOrCreate({
    where: { groupJid },
    defaults: { groupJid },
  });
  return greetings;
};

const setWelcome = async (groupJid, message, enabled) => {
  const greetings = await getGreetings(groupJid);
  if (message !== null) greetings.welcomeMessage = message;
  if (enabled !== undefined) greetings.welcomeEnabled = enabled;
  await greetings.save();
  return greetings;
};

const setGoodbye = async (groupJid, message, enabled) => {
  const greetings = await getGreetings(groupJid);
  if (message !== null) greetings.goodbyeMessage = message;
  if (enabled !== undefined) greetings.goodbyeEnabled = enabled;
  await greetings.save();
  return greetings;
};

module.exports = {
  Greetings,
  getGreetings,
  setWelcome,
  setGoodbye,
}; 
