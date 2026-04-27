const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noelleChat', {
  status: () => ipcRenderer.invoke('noelle:status'),
  chat: (payload) => ipcRenderer.invoke('noelle:chat', payload),
  openOllamaDownload: () => ipcRenderer.invoke('noelle:openOllamaDownload'),
});
