'use strict';

const { BrowserWindow } = require('electron');
const { PATHS } = require('./app_paths');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#09090b',
    title: 'Noelle v20 - Chat Texto',
    webPreferences: {
      preload: PATHS.preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(PATHS.rendererIndex);
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { createMainWindow, getMainWindow };
