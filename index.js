const express = require('express');
const path = require('path');
const config = require('./config');
const { connect, getandRequirePlugins, requireJS } = require('./lib');

const app = express();
const PORT = process.env.PORT || '8000';

async function initialize() {
 await requireJS(path.join(__dirname, '/lib/Store/'));
 await config.DATABASE.sync();
 await requireJS(path.join(__dirname, '/plugins/'));
 await getandRequirePlugins();
 return await connect();
}

app.listen(PORT, async () => {
 return await initialize();
});
