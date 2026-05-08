'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const IPC = Object.freeze({
  APP_PING: 'app:ping',
  APP_INFO: 'app:info',
  AI_STATUS: 'ai:status',
  AI_CHAT: 'ai:chat',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write'
});

contextBridge.exposeInMainWorld('noelle', {
  app: {
    ping: () => ipcRenderer.invoke(IPC.APP_PING),
    info: () => ipcRenderer.invoke(IPC.APP_INFO)
  },
  ai: {
    status: () => ipcRenderer.invoke(IPC.AI_STATUS),
    chat: (payload) => ipcRenderer.invoke(IPC.AI_CHAT, payload || {})
  },
  config: {
    read: (name) => ipcRenderer.invoke(IPC.CONFIG_READ, name),
    write: (name, value) => ipcRenderer.invoke(IPC.CONFIG_WRITE, name, value)
  }
});
