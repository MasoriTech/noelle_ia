const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noelleChat', {
  getState: () => ipcRenderer.invoke('noelle-chat:get-state'),
  setConfig: (patch) => ipcRenderer.invoke('noelle-chat:set-config', patch),
  status: () => ipcRenderer.invoke('noelle-chat:status'),
  chat: (payload) => ipcRenderer.invoke('noelle-chat:chat', payload),
  preload: () => ipcRenderer.invoke('noelle-chat:preload'),
  unload: () => ipcRenderer.invoke('noelle-chat:unload'),
  reset: () => ipcRenderer.invoke('noelle-chat:reset'),
  remember: (text) => ipcRenderer.invoke('noelle-chat:remember', text),
  openPaths: () => ipcRenderer.invoke('noelle-chat:open-paths'),
});
