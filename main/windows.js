const { BrowserWindow } = require('electron');
const { rendererPath } = require('./app_paths');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#111114',
    webPreferences: {
      preload: require('path').join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(rendererPath('index.html'));
  return win;
}

module.exports = { createMainWindow };
