"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const noelleAPI = {
  status: () => invoke("noelle:status"),
  chat: (payload) => invoke("noelle:chat", payload),
  loadState: () => invoke("noelle:load-state"),
  saveState: (patch) => invoke("noelle:save-state", patch),
  assets: () => invoke("noelle:assets"),
  openExternal: (url) => invoke("noelle:open-external", url),
  openAvatar: () => invoke("avatar:open"),
  closeAvatar: () => invoke("avatar:close"),
  avatarCommand: (command, payload) => invoke("avatar:command", command, payload),
  setAvatarAlwaysOnTop: (enabled) => invoke("avatar:always-on-top", enabled),
  saveAvatarPosition: () => invoke("avatar:save-position"),
  speak: (text) => invoke("tts:speak", text),
  onAvatarCommand: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("avatar:command", listener);
    return () => ipcRenderer.removeListener("avatar:command", listener);
  }
};

// API nova.
contextBridge.exposeInMainWorld("noelleAPI", noelleAPI);

// Compatibilidade com código antigo que chamava window.desktopWidget.
contextBridge.exposeInMainWorld("desktopWidget", {
  status: noelleAPI.status,
  coreStatus: noelleAPI.status,
  noelleCoreStatus: noelleAPI.status,
  chat: noelleAPI.chat,
  noelleCoreChat: noelleAPI.chat,
  loadState: noelleAPI.loadState,
  saveState: noelleAPI.saveState,
  getAssets: noelleAPI.assets,
  listAssets: noelleAPI.assets,
  openAvatar: noelleAPI.openAvatar,
  closeAvatar: noelleAPI.closeAvatar,
  saveAvatarPosition: noelleAPI.saveAvatarPosition,
  setAlwaysOnTop: noelleAPI.setAvatarAlwaysOnTop,
  setAvatarAlwaysOnTop: noelleAPI.setAvatarAlwaysOnTop,
  avatarCommand: noelleAPI.avatarCommand,
  playMotion: (motion) => noelleAPI.avatarCommand("motion", motion),
  setExpression: (expression) => noelleAPI.avatarCommand("expression", expression),
  equipItem: (item) => noelleAPI.avatarCommand("item", item),
  setCamera: (camera) => noelleAPI.avatarCommand("camera", camera),
  speak: noelleAPI.speak,
  ttsSpeak: noelleAPI.speak,
  openExternal: noelleAPI.openExternal,
  onAvatarCommand: noelleAPI.onAvatarCommand
});
