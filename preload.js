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


contextBridge.exposeInMainWorld("noelleRoom", {
  open: () => ipcRenderer.invoke("room:open"),
  close: () => ipcRenderer.invoke("room:close"),
  listCatalog: () => ipcRenderer.invoke("room:catalog"),
  loadLayout: () => ipcRenderer.invoke("room:load-layout"),
  saveLayout: (layout) => ipcRenderer.invoke("room:save-layout", layout)
});

// NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN
(() => {
  try {
    if (globalThis.__NOELLE_V19_3_COMPLETE_BOOTSTRAPPED__) return;
    globalThis.__NOELLE_V19_3_COMPLETE_BOOTSTRAPPED__ = true;

    const electronForNoelleV19 = require("electron");
    const bridgeForNoelleV19 = electronForNoelleV19.contextBridge;
    const ipcForNoelleV19 = electronForNoelleV19.ipcRenderer;

    if (bridgeForNoelleV19 && ipcForNoelleV19 && !globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__) {
      globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__ = true;
      bridgeForNoelleV19.exposeInMainWorld("noelleRoomV19", {
        open: () => ipcForNoelleV19.invoke("room:open"),
        listCatalog: () => ipcForNoelleV19.invoke("room:catalog"),
        loadLayout: () => ipcForNoelleV19.invoke("room:load-layout"),
        saveLayout: (layout) => ipcForNoelleV19.invoke("room:save-layout", layout)
      });
    }

    const injectNoelleV19Complete = () => {
      try {
        if (document.getElementById("noelle-v19-3-complete-runtime-script")) return;
        const script = document.createElement("script");
        script.id = "noelle-v19-3-complete-runtime-script";
        script.src = "./renderer/noelle_v19_3_complete_ui_md.js";
        script.defer = true;
        (document.head || document.documentElement).appendChild(script);
      } catch (err) {
        try { console.warn("[Noelle] Falha ao injetar V19.3", err); } catch {}
      }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectNoelleV19Complete);
    else injectNoelleV19Complete();
  } catch (err) {
    try { console.warn("[Noelle] preload V19.3 indisponível", err); } catch {}
  }
})();
// NOELLE_V19_3_COMPLETE_PRELOAD_END

// NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN
(() => {
  try {
    if (globalThis.__NOELLE_V19_5_AVATAR_BOOTSTRAPPED__) return;
    globalThis.__NOELLE_V19_5_AVATAR_BOOTSTRAPPED__ = true;

    const injectNoelleV195Avatar = () => {
      try {
        if (document.getElementById("noelle-v19-5-avatar-panel-script")) return;
        const script = document.createElement("script");
        script.id = "noelle-v19-5-avatar-panel-script";
        script.src = "./renderer/avatar_v19_5_panel_bootstrap.js";
        script.defer = true;
        (document.head || document.documentElement).appendChild(script);
      } catch (err) {
        try { console.warn("[Noelle] Falha ao injetar Avatar V19.5", err); } catch {}
      }
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectNoelleV195Avatar);
    else injectNoelleV195Avatar();
  } catch (err) {
    try { console.warn("[Noelle] preload Avatar V19.5 indisponível", err); } catch {}
  }
})();
// NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_END
