'use strict';

const { app } = require('electron');
const { createMainWindow } = require('./windows');
const { registerIpcRoutes } = require('./ipc_routes');
const { ensureAppDirs } = require('./app_paths');

app.whenReady().then(() => {
  ensureAppDirs();
  registerIpcRoutes();
  createMainWindow();

  app.on('activate', () => {
    if (require('electron').BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
