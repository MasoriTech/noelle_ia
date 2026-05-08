const path = require('path');
const { app } = require('electron');

function rootPath(...parts) {
  return path.join(app.getAppPath(), ...parts);
}

function userDataPath(...parts) {
  return path.join(app.getPath('userData'), ...parts);
}

function rendererPath(...parts) {
  return rootPath('renderer', ...parts);
}

module.exports = { rootPath, userDataPath, rendererPath };
