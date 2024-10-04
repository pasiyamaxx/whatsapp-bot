const fs = require("fs").promises;
const path = require("path");
const config = require("./config");
const {connect} = require("./lib");
const {requireJS}=require('./utils/functions')
const { getandRequirePlugins } = require("./source/database/plugins");

async function initialize() {
  console.log("X-Asena");
  try {
    await requireJS(path.join(__dirname, "/source/database/"));
    console.log("Syncing Database");

    await config.DATABASE.sync();

    console.log("⬇  Installing Plugins...");
    await requireJS(path.join(__dirname, "/plugins/"));
    await getandRequirePlugins();
    console.log("✅ Plugins Installed!");
    return await connect();
  } catch (error) {
    console.error("Initialization error:", error);
    return process.exit(1); // Exit with error status
  }
}

initialize();