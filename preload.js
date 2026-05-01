"use strict";

// Noelle V19.8.1a — preload canônico e limpo.
// Este arquivo deve expor apenas pontes seguras para o renderer.
// Ele NÃO injeta UI, NÃO cria botões flutuantes e NÃO carrega runtimes visuais antigos.

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
  openAvatarPreviewLoadFile: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),
  openAvatarPreview: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),
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

contextBridge.exposeInMainWorld("noelleAPI", noelleAPI);

// Compatibilidade com renderers antigos do widget/avatar.
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
  openAvatarPreviewLoadFile: noelleAPI.openAvatarPreviewLoadFile,
  openAvatarPreview: noelleAPI.openAvatarPreviewLoadFile,
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

const roomBridge = {
  open: () => invoke("room:open"),
  close: () => invoke("room:close"),
  listCatalog: () => invoke("room:catalog"),
  loadLayout: () => invoke("room:load-layout"),
  saveLayout: (layout) => invoke("room:save-layout", layout)
};

contextBridge.exposeInMainWorld("noelleRoom", roomBridge);

// Compatibilidade: mantém a API antiga, mas sem injetar UI antiga.
contextBridge.exposeInMainWorld("noelleRoomV19", {
  open: roomBridge.open,
  listCatalog: roomBridge.listCatalog,
  loadLayout: roomBridge.loadLayout,
  saveLayout: roomBridge.saveLayout
});

// NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD_BEGIN
try {
  const electron = require("electron");
  const contextBridge = electron.contextBridge;
  const ipcRenderer = electron.ipcRenderer;
  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD__) {
    globalThis.__NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD__ = true;
    const importAvatarApi = {
      importAvatar: () => ipcRenderer.invoke("noelle:v19_8_24:import-avatar")
    };
    contextBridge.exposeInMainWorld("noelleAvatarImport", importAvatarApi);
    contextBridge.exposeInMainWorld("noelleAvatarImportV19824", importAvatarApi);
    contextBridge.exposeInMainWorld("noelleAvatarImportV19821", importAvatarApi);
    contextBridge.exposeInMainWorld("noelleAvatarImportV19820", importAvatarApi);
  }
} catch (err) {
  console.warn("[Noelle V19.8.24] preload import avatar indisponível:", err && err.message ? err.message : err);
}
// NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD_END


;try {
  const { contextBridge, ipcRenderer } = require("electron");
  contextBridge.exposeInMainWorld("yoruAvatarAssets", {
    list: () => ipcRenderer.invoke("yoru:avatars:list"),
    default: () => ipcRenderer.invoke("yoru:avatars:default")
  });
} catch (err) {
  console.warn("[avatar-assets-v31.2] preload bridge unavailable:", err && err.message ? err.message : err);
}
