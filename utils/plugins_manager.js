const config = require('../config');

var commands = [];

/**
 * Registers a command with its associated function and modifies command patterns.
 * @param {Object} cmdInfo - Information about the command.
 * @param {String} cmdInfo.pattern - The command pattern to match.
 * @param {Boolean} [cmdInfo.fromMe=false] - Indicates if the command is from the bot itself.
 * @param {Boolean} [cmdInfo.dontAddCommandList=false] - If true, the command won't be added to the command list.
 * @param {String} [cmdInfo.type='misc'] - The type of command.
 * @param {Function} func - The function to execute when the command is called.
 * @returns {Object} - The modified commandInfo object.
 */
function bot(cmdInfo, func) {
 cmdInfo.function = func;
 if (cmdInfo.pattern) {
  cmdInfo.originalPattern = cmdInfo.pattern; // Store the original pattern
  cmdInfo.pattern = new RegExp(`^(${config.HANDLERS})\\s*(${cmdInfo.pattern})(?:\\s+(.*))?$`, 'i'); // Create a new RegExp
 }
 cmdInfo.dontAddCommandList = cmdInfo.dontAddCommandList || false; // Default to false
 cmdInfo.fromMe = cmdInfo.fromMe || false; // Default to false
 cmdInfo.type = cmdInfo.type || 'misc'; // Default to 'misc'

 commands.push(cmdInfo);
 return cmdInfo;
}

module.exports={
  bot,
  commands
}