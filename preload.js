"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

const noelleAPI = Object.freeze({
  status: () => ipcRenderer.invoke("noelle:status"),
  chat: (payload) => ipcRenderer.invoke("noelle:chat", payload || {}),
  loadState: () => ipcRenderer.invoke("noelle:load-state"),
  saveState: (patch) => ipcRenderer.invoke("noelle:save-state", patch || {}),
  listExpressions: () => ipcRenderer.invoke("noelle:list-expressions"),
  applyExpression: (id) => ipcRenderer.invoke("noelle:apply-expression", id),
  openExternal: (url) => ipcRenderer.invoke("noelle:open-external", url),
});

// Compatibilidade com nomes usados em versões antigas da janela.
// Assim a UI nova e partes antigas podem coexistir durante a reintegração.
const desktopWidget = Object.freeze({
  status: noelleAPI.status,
  getStatus: noelleAPI.status,
  noelleCoreStatus: noelleAPI.status,
  coreStatus: noelleAPI.status,
  chat: noelleAPI.chat,
  noelleCoreChat: noelleAPI.chat,
  coreChat: noelleAPI.chat,
  loadState: noelleAPI.loadState,
  saveState: noelleAPI.saveState,
  listExpressions: noelleAPI.listExpressions,
  getExpressions: noelleAPI.listExpressions,
  applyExpression: noelleAPI.applyExpression,
  setExpression: noelleAPI.applyExpression,
  openExternal: noelleAPI.openExternal,
  invoke,
});

contextBridge.exposeInMainWorld("noelleAPI", noelleAPI);
contextBridge.exposeInMainWorld("desktopWidget", desktopWidget);
