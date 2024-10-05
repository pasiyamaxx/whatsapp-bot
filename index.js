const express = require('express');
const path = require('path');
const config = require('./config');
const { connect } = require('./lib');
const { requireJS } = require('./utils');
const { getandRequirePlugins } = require('./lib/database').Plugins;
const { SessionManager } = require('./client');
const app = express();
const PORT = process.env.PORT || '8000';
async function makeSession() {
const session = new SessionManager();
session.createSession();
}
async function initialize() {
await requireJS(path.join(__dirname, '/lib/database/'));
await config.DATABASE.sync();
await requireJS(path.join(__dirname, '/plugins/'));
await getandRequirePlugins();
return await connect();
}

app.listen(PORT, async () => {
await makeSession();
return await initialize();
});
