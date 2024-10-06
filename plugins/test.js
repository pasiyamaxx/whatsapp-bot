const {bot}=require('../utils')

bot(
 {
  pattern: 'test',
  fromMe: false,
  desc: 'test'
 },
 async (message,match,m,client) => {
  return message.reply('hello')
 }
)