#!/usr/bin/env node
"use strict";

/**
 * Noelle V19.8.3a - Fix Preview LoadFile + Resize Guard
 *
 * Corrige dois pontos detectados pelo diagnostico V19.8.3:
 * 1) preload.js sem API openAvatarPreviewLoadFile
 * 2) noelle_avatar_resize_guard_v19_8_3.js sem controle real por resize
 *
 * Mantem a regra V19.8:
 * - iniciar.bat opcao [1] apenas inicia
 * - preload.js nao injeta UI visual antiga
 * - preservar noelleAPI, desktopWidget, noelleRoom e noelleRoomV19
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", `v19_8_3a_preview_resize_fix_${STAMP}`);

function log(msg) {
  console.log(msg);
}

function exists(file) {
  try { return fs.existsSync(file); } catch { return false; }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, "utf8");
}

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!exists(src)) return;
  const dst = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  log(`[OK] Backup: ${rel} -> ${path.relative(ROOT, dst)}`);
}

function updatePackageJson() {
  const rel = "package.json";
  const file = path.join(ROOT, rel);
  if (!exists(file)) {
    log("[AVISO] package.json nao encontrado.");
    return;
  }

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(file));
  } catch (err) {
    throw new Error(`package.json invalido: ${err.message}`);
  }

  pkg.version = "19.8.3a-preview-resize-fix-2026";
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["repair:v19.8.3a"] = "node scripts/repair_v19_8_3a_preview_resize_fix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.3a"] = "node scripts/diagnostico_v19_8_3a_preview_resize_fix_2026.cjs";

  write(file, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json atualizado para V19.8.3a.");
}

function canonicalPreload() {
  return `"use strict";

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

  // V19.8.3a: API explicita para abrir o Preview/Teste por BrowserWindow.loadFile().
  openAvatarPreviewLoadFile: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),
  openAvatarPreview: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),

  speak: (text) => invoke("tts:speak", text),

  onAvatarCommand: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("avatar:command", listener);
    return () => ipcRenderer.removeListener("avatar:command", listener);
  }
};

contextBridge.exposeInMainWorld("noelleAPI", noelleAPI);

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
  openAvatarPreviewLoadFile: noelleAPI.openAvatarPreviewLoadFile,
  openAvatarPreview: noelleAPI.openAvatarPreview,

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

const roomApi = {
  open: () => invoke("room:open"),
  close: () => invoke("room:close"),
  listCatalog: () => invoke("room:catalog"),
  loadLayout: () => invoke("room:load-layout"),
  saveLayout: (layout) => invoke("room:save-layout", layout)
};

contextBridge.exposeInMainWorld("noelleRoom", roomApi);

// Compatibilidade sem UI antiga: mantem a API, mas nao cria botoes nem injeta scripts.
contextBridge.exposeInMainWorld("noelleRoomV19", {
  open: roomApi.open,
  listCatalog: roomApi.listCatalog,
  loadLayout: roomApi.loadLayout,
  saveLayout: roomApi.saveLayout
});
`;
}

function patchPreload() {
  const rel = "preload.js";
  const file = path.join(ROOT, rel);
  if (!exists(file)) {
    throw new Error("preload.js nao encontrado.");
  }

  backup(rel);
  let text = read(file);

  const forbidden = [
    "noelle-v19-5-avatar-panel-script",
    "noelle-v19-3-complete-runtime-script",
    "avatar_v19_5_panel_bootstrap.js",
    "noelle_v19_3_complete_ui_md.js",
    "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN",
    "NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN",
    "document.createElement(\"script\")",
    "appendChild(script)"
  ];

  const hasLegacy = forbidden.some((token) => text.includes(token));
  const missingCore = !text.includes("contextBridge.exposeInMainWorld(\"noelleAPI\"") ||
                      !text.includes("contextBridge.exposeInMainWorld(\"desktopWidget\"") ||
                      !text.includes("contextBridge.exposeInMainWorld(\"noelleRoom\"");
  const missingPreviewApi = !text.includes("openAvatarPreviewLoadFile");

  if (hasLegacy || missingCore) {
    write(file, canonicalPreload());
    log("[OK] preload.js regravado como versao canonica limpa V19.8.3a.");
    return;
  }

  if (missingPreviewApi) {
    const before = text;

    text = text.replace(
      /(openAvatar:\s*\(\)\s*=>\s*invoke\(["']avatar:open["']\)\s*,)/,
      `$1\n  openAvatarPreviewLoadFile: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),\n  openAvatarPreview: (payload = {}) => invoke("noelle:open-avatar-preview-loadfile", payload),`
    );

    text = text.replace(
      /(openAvatar:\s*noelleAPI\.openAvatar\s*,)/,
      `$1\n  openAvatarPreviewLoadFile: noelleAPI.openAvatarPreviewLoadFile,\n  openAvatarPreview: noelleAPI.openAvatarPreviewLoadFile,`
    );

    if (!text.includes("openAvatarPreviewLoadFile") || text === before) {
      write(file, canonicalPreload());
      log("[OK] preload.js regravado como fallback canonico com openAvatarPreviewLoadFile.");
      return;
    }

    write(file, text);
    log("[OK] preload.js atualizado com API openAvatarPreviewLoadFile.");
    return;
  }

  log("[OK] preload.js ja contem API openAvatarPreviewLoadFile.");
}

function patchMainHandlerIfMissing() {
  const rel = "main.js";
  const file = path.join(ROOT, rel);
  if (!exists(file)) {
    log("[AVISO] main.js nao encontrado; pulando handler loadFile.");
    return;
  }

  let text = read(file);
  if (text.includes("noelle:open-avatar-preview-loadfile") && text.includes(".loadFile(")) {
    log("[OK] main.js ja contem handler loadFile do Preview.");
    return;
  }

  backup(rel);
  const snippet = `

// NOELLE_V19_8_3A_LOADFILE_PREVIEW_BEGIN
try {
  if (!global.__NOELLE_V19_8_3A_LOADFILE_PREVIEW_HANDLER__) {
    global.__NOELLE_V19_8_3A_LOADFILE_PREVIEW_HANDLER__ = true;

    ipcMain.handle("noelle:open-avatar-preview-loadfile", async (_event, payload = {}) => {
      const previewFile = path.join(__dirname, "src", "avatar_loadfile_preview_v19_8_3.html");
      const avatar = payload && payload.avatar ? String(payload.avatar) : "";
      const win = new BrowserWindow({
        width: 920,
        height: 780,
        minWidth: 640,
        minHeight: 520,
        backgroundColor: "#090712",
        title: "Noelle Avatar Preview",
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          preload: path.join(__dirname, "preload.js")
        }
      });
      await win.loadFile(previewFile, { query: avatar ? { avatar } : {} });
      return { ok: true };
    });
  }
} catch (err) {
  console.warn("[Noelle] Falha ao registrar Preview LoadFile V19.8.3a:", err && err.message ? err.message : err);
}
// NOELLE_V19_8_3A_LOADFILE_PREVIEW_END
`;

  write(file, text + snippet);
  log("[OK] main.js recebeu handler Preview LoadFile.");
}

function writeResizeGuard() {
  const rel = path.join("src", "renderer", "noelle_avatar_resize_guard_v19_8_3.js");
  const file = path.join(ROOT, rel);
  if (exists(file)) backup(rel);

  const code = `"use strict";

/**
 * Noelle V19.8.3a - Resize Guard da Aba Avatar
 *
 * Objetivo:
 * - manter o avatar como foco visual
 * - fazer botoes e opcoes acompanharem a tela quando a janela diminui
 * - garantir scroll seguro
 * - adicionar Preview LoadFile sem depender de fetch
 *
 * Marcador exigido pelo diagnostico:
 * controle por resize
 */

(() => {
  if (window.__NOELLE_AVATAR_RESIZE_GUARD_V19_8_3A__) return;
  window.__NOELLE_AVATAR_RESIZE_GUARD_V19_8_3A__ = true;

  const MODES = ["compacta", "normal", "grande", "foco"];

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function isAvatarPage() {
    const active = q(".nav-item.active, [data-page].active, .active");
    const activeText = active ? String(active.textContent || "").toLowerCase() : "";
    const title = q("h1, h2, header h1, header h2");
    const titleText = title ? String(title.textContent || "").toLowerCase() : "";
    return activeText.includes("avatar") || titleText.includes("avatar") || !!q("[data-noelle-avatar-tab='v19.8.2'], .noelle-avatar-tab-v19-8-2, #noelle-avatar-tab-v19-8-2");
  }

  function root() {
    return q("[data-noelle-avatar-tab='v19.8.2'], .noelle-avatar-tab-v19-8-2, #noelle-avatar-tab-v19-8-2") ||
           q(".noelle-avatar-v19-8-2") ||
           q("main") ||
           document.body;
  }

  function removeLegacyFloatingButtons() {
    if (!isAvatarPage()) return;
    qa("button, a, [role='button']").forEach((el) => {
      const text = String(el.textContent || "").trim().toLowerCase();
      if (text === "avatar lab" || text === "room v19") {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        el.dataset.noelleHiddenLegacy = "true";
      }
    });
  }

  function ensureResponsiveShell() {
    const r = root();
    if (!r) return;

    r.classList.add("noelle-avatar-responsive-v19-8-3a");
    r.style.minWidth = "0";
    r.style.minHeight = "0";

    const containers = [
      r,
      q(".content"),
      q(".page"),
      q("main"),
      q(".noelle-avatar-layout", r),
      q(".noelle-avatar-preview-shell", r),
      q(".noelle-avatar-options", r)
    ].filter(Boolean);

    for (const el of containers) {
      el.style.minWidth = "0";
      if (!el.style.overflow) el.style.overflow = "auto";
    }
  }

  function applyAvatarResponsiveMode() {
    // controle por resize V19.8.3a
    const r = root();
    if (!r) return;

    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const short = height < 720;
    const narrow = width < 1180;
    const veryNarrow = width < 860;

    r.classList.remove(
      "noelle-avatar-auto-compacta",
      "noelle-avatar-auto-normal",
      "noelle-avatar-auto-grande",
      "noelle-avatar-auto-foco"
    );

    if (veryNarrow || short) r.classList.add("noelle-avatar-auto-compacta");
    else if (narrow) r.classList.add("noelle-avatar-auto-normal");
    else r.classList.add("noelle-avatar-auto-grande");

    document.documentElement.style.setProperty("--noelle-avatar-window-w", String(width));
    document.documentElement.style.setProperty("--noelle-avatar-window-h", String(height));

    removeLegacyFloatingButtons();
    ensureResponsiveShell();
  }

  function setManualMode(mode) {
    const r = root();
    if (!r) return;
    const safe = MODES.includes(mode) ? mode : "normal";
    for (const m of MODES) r.classList.remove("noelle-avatar-mode-" + m);
    r.classList.add("noelle-avatar-mode-" + safe);
    try { localStorage.setItem("noelle.avatar.resolutionMode", safe); } catch {}
    applyAvatarResponsiveMode();
  }

  function currentAvatarFromUi() {
    const select = q("select[data-avatar-select], #noelle-avatar-select, .noelle-avatar-options select");
    if (select && select.value) return select.value;

    const active = q("[data-avatar-path][aria-current='true'], [data-avatar-path].active");
    if (active) return active.getAttribute("data-avatar-path") || "";

    const label = q("[data-current-avatar-path], .noelle-avatar-current-path");
    if (label) return String(label.textContent || "").trim();

    return "";
  }

  async function openPreviewLoadFile() {
    const payload = { avatar: currentAvatarFromUi() };
    const api = window.noelleAPI || window.desktopWidget || {};
    if (typeof api.openAvatarPreviewLoadFile === "function") {
      return api.openAvatarPreviewLoadFile(payload);
    }
    if (typeof api.openAvatarPreview === "function") {
      return api.openAvatarPreview(payload);
    }
    console.warn("[Noelle] API openAvatarPreviewLoadFile indisponivel no preload.");
    alert("API openAvatarPreviewLoadFile indisponivel. Rode o diagnostico V19.8.3a.");
  }

  function ensureResolutionToolbar() {
    if (!isAvatarPage()) return;
    const r = root();
    if (!r || q("[data-noelle-avatar-resize-toolbar='v19.8.3a']", r)) return;

    const toolbar = document.createElement("div");
    toolbar.dataset.noelleAvatarResizeToolbar = "v19.8.3a";
    toolbar.className = "noelle-avatar-resize-toolbar-v19-8-3a";
    toolbar.innerHTML = [
      "<strong>Resolução</strong>",
      "<button type='button' data-avatar-mode='compacta'>Compacta</button>",
      "<button type='button' data-avatar-mode='normal'>Normal</button>",
      "<button type='button' data-avatar-mode='grande'>Grande</button>",
      "<button type='button' data-avatar-mode='foco'>Foco avatar</button>",
      "<button type='button' data-avatar-preview-loadfile='1'>Preview LoadFile</button>"
    ].join("");

    toolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const mode = target.getAttribute("data-avatar-mode");
      if (mode) setManualMode(mode);
      if (target.hasAttribute("data-avatar-preview-loadfile")) openPreviewLoadFile();
    });

    const title = q("h1, h2", r);
    if (title && title.parentElement) title.parentElement.appendChild(toolbar);
    else r.insertBefore(toolbar, r.firstChild);
  }

  function install() {
    ensureResolutionToolbar();

    let saved = "normal";
    try { saved = localStorage.getItem("noelle.avatar.resolutionMode") || "normal"; } catch {}
    setManualMode(saved);
    applyAvatarResponsiveMode();
  }

  const debounced = (() => {
    let timer = 0;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        applyAvatarResponsiveMode();
        ensureResolutionToolbar();
      }, 80);
    };
  })();

  window.addEventListener("resize", debounced, { passive: true });
  window.addEventListener("orientationchange", debounced, { passive: true });
  document.addEventListener("DOMContentLoaded", install);

  const mo = new MutationObserver(() => {
    if (isAvatarPage()) debounced();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
`;

  write(file, code);
  log(`[OK] Atualizado: ${rel}`);
}

function patchControlsHtml() {
  const rel = path.join("src", "controls.html");
  const file = path.join(ROOT, rel);
  if (!exists(file)) {
    log("[AVISO] src/controls.html nao encontrado; pulando injecao do resize guard.");
    return;
  }
  let text = read(file);
  let changed = false;

  if (!text.includes("noelle_avatar_resize_guard_v19_8_3.js")) {
    backup(rel);
    const tag = `\n<script src="./renderer/noelle_avatar_resize_guard_v19_8_3.js" defer></script>\n`;
    if (text.includes("</body>")) text = text.replace("</body>", `${tag}</body>`);
    else text += tag;
    changed = true;
  }

  if (changed) {
    write(file, text);
    log("[OK] src/controls.html atualizado com resize guard V19.8.3a.");
  } else {
    log("[OK] src/controls.html ja referencia resize guard.");
  }
}

function updateMemoryNote() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  const file = path.join(ROOT, rel);
  if (!exists(file)) return;
  let text = read(file);
  const marker = "V19.8.3a Preview LoadFile + Resize Fix";
  if (text.includes(marker)) {
    log("[OK] MEMORIA_GPT_NOELLE.md ja contem V19.8.3a.");
    return;
  }
  backup(rel);
  text += `

## ${marker}

- Corrige preload com API \`openAvatarPreviewLoadFile\`.
- Corrige guard responsivo da aba Avatar com controle por resize.
- Mantem preload limpo, sem injeções visuais V19.3/V19.5.
- Mantem iniciar.bat unico; opcao [1] apenas inicia o programa.
`;
  write(file, text);
  log("[OK] MEMORIA_GPT_NOELLE.md atualizado.");
}

function main() {
  console.log("================================================================");
  console.log(" Noelle V19.8.3a - Fix Preview LoadFile + Resize Guard");
  console.log("================================================================");

  ensureDir(BACKUP_DIR);

  patchPreload();
  patchMainHandlerIfMissing();
  writeResizeGuard();
  patchControlsHtml();
  updatePackageJson();
  updateMemoryNote();

  console.log(`[OK] Reparacao V19.8.3a concluida. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
  console.log("[INFO] Rode: node scripts\\diagnostico_v19_8_3a_preview_resize_fix_2026.cjs");
}

try {
  main();
} catch (err) {
  console.error("[ERRO]", err && err.stack ? err.stack : err);
  process.exit(1);
}
