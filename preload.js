"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noelleAPI", {
  status: () => ipcRenderer.invoke("noelle:status"),
  chat: (payload) => ipcRenderer.invoke("noelle:chat", payload),
  loadState: () => ipcRenderer.invoke("noelle:load-state"),
  saveState: (patch) => ipcRenderer.invoke("noelle:save-state", patch),
  openExternal: (url) => ipcRenderer.invoke("noelle:open-external", url)
});
