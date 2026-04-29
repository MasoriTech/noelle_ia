#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", `v19_8_1a_preload_forcado_2026-${STAMP}`);

function log(message) { console.log(message); }
function fail(message) { console.error(`[ERRO] ${message}`); process.exitCode = 1; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}
function backup(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return;
  const target = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(full, target);
  log(`[OK] Backup: ${rel} -> ${path.relative(ROOT, target)}`);
}
function updateJson(rel, updater) {
  if (!exists(rel)) return false;
  backup(rel);
  const data = JSON.parse(read(rel));
  updater(data);
  write(rel, `${JSON.stringify(data, null, 2)}\n`);
  return true;
}

const PRELOAD_CANONICAL = String.raw`"use strict";

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
`;

function cleanControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) return;
  let html = read(rel);
  const original = html;
  html = html
    .replace(/\s*<script\b[^>]*src=["'][^"']*noelle_v19_3_complete_ui_md\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, "\n")
    .replace(/\s*<script\b[^>]*src=["'][^"']*avatar_v19_5_panel_bootstrap\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, "\n");
  if (html !== original) {
    backup(rel);
    write(rel, html);
    log("[OK] src/controls.html: script tags visuais legadas removidas.");
  } else {
    log("[OK] src/controls.html: nenhuma script tag visual legada conhecida encontrada.");
  }
}

function appendMemoryNote() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let md = read(rel);
  if (md.includes("V19.8.1a — Preload Forçado")) {
    log("[OK] MEMORIA_GPT_NOELLE.md já contém nota V19.8.1a.");
    return;
  }
  backup(rel);
  md += `\n\n## V19.8.1a — Preload Forçado\n\n- preload.js consolidado como ponte segura, sem injeção visual V19.3/V19.5.\n- Mantidas APIs window.noelleAPI, window.desktopWidget, window.noelleRoom e window.noelleRoomV19.\n- A aba Avatar final deve ser implementada no renderer principal, não por preload.\n- iniciar.bat continua com opção [1] apenas para iniciar, sem aplicar patch automático.\n`;
  write(rel, md);
  log("[OK] MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.1a.");
}

function main() {
  log("================================================================");
  log(" Noelle V19.8.1a Preload Forçado 2026 - reparo controlado");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists("package.json")) {
    fail("Execute este script na raiz do projeto noelle_ia, onde existe package.json.");
    return;
  }

  backup("preload.js");
  write("preload.js", PRELOAD_CANONICAL);
  log("[OK] preload.js reescrito em versão canônica limpa, sem injeção visual legada.");

  cleanControlsHtml();

  updateJson("package.json", (pkg) => {
    pkg.version = "19.8.1a-preload-forcado-2026";
    pkg.scripts = pkg.scripts || {};
    pkg.scripts["repair:v19.8.1a"] = "node scripts/repair_v19_8_1a_preload_forcado_2026.cjs";
    pkg.scripts["diagnostico:v19.8.1a"] = "node scripts/diagnostico_v19_8_1a_preload_forcado_2026.cjs";
  });
  log("[OK] package.json atualizado para V19.8.1a.");

  appendMemoryNote();

  log(`[OK] Reparação V19.8.1a concluída. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
  log("[INFO] Rode: node scripts\\diagnostico_v19_8_1a_preload_forcado_2026.cjs");
}

main();
