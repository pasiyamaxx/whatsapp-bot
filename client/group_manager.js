const Base = require('./base')
const config = require('../config')

class GroupManage extends Base {
  constructor(client, data) {
    super(client);
    if (data) this._patch(data)
  }
}
module.exports = GroupManage