"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const VERSION = "17.4.0";
const BACKUP_ROOT = path.join(ROOT, "backups", "v17_4_tray_widget_" + stamp());

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

function log(msg) { console.log(msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return fs.readFileSync(abs(rel), "utf8"); }
function write(rel, text) { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), text, "utf8"); }

function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(abs(rel), dst);
}

function backupAndWrite(rel, text) {
  backup(rel);
  write(rel, text);
  log("[OK] Atualizado: " + rel);
}

function findFunctionRange(text, name) {
  const start = text.indexOf(`function ${name}`);
  if (start < 0) return null;
  const brace = text.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return [start, i + 1];
    }
  }
  return null;
}

function replaceFunction(text, name, replacement) {
  const range = findFunctionRange(text, name);
  if (!range) {
    warn(`Funcao ${name} nao encontrada.`);
    return text;
  }
  return text.slice(0, range[0]) + replacement + text.slice(range[1]);
}

function insertBefore(text, marker, insert) {
  if (text.includes(insert.trim().slice(0, 80))) return text;
  const idx = text.indexOf(marker);
  if (idx < 0) {
    warn("Marcador nao encontrado: " + marker.slice(0, 80));
    return text;
  }
  return text.slice(0, idx) + insert + text.slice(idx);
}

function patchMain() {
  const rel = "main.js";
  if (!exists(rel)) return fail("main.js nao encontrado.");
  let text = read(rel);

  text = text.replace(
    'const { app, BrowserWindow, ipcMain, shell } = require("electron");',
    'const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");'
  );

  if (!text.includes("Tray, Menu, nativeImage") && text.includes("require(\"electron\")")) {
    text = text.replace(
      /const \{([^}]+)\} = require\("electron"\);/,
      (m, inner) => {
        const parts = inner.split(",").map((s) => s.trim()).filter(Boolean);
        for (const name of ["Tray", "Menu", "nativeImage"]) {
          if (!parts.includes(name)) parts.push(name);
        }
        return `const { ${parts.join(", ")} } = require("electron");`;
      }
    );
  }

  text = text.replace(/const ASSETS_DIR = path\.join\(SRC_DIR,\s*"assets"\);/g,
    'const ASSETS_DIR = path.join(SRC_DIR, "assets"); const APP_ICONS_DIR = path.join(ROOT_DIR, "assets", "icons");');

  if (!text.includes("let tray = null;")) {
    text = text.replace("let mainWin = null; let avatarWin = null;", "let mainWin = null; let avatarWin = null; let tray = null; let isQuitting = false;");
  }

  text = text.replace(/avatarWin\.loadFile\(path\.join\(SRC_DIR,\s*"avatar\.html"\)\);/g,
    'avatarWin.loadFile(path.join(SRC_DIR, "avatar_view.html"));');

  const helpers =
`function getAppIconPath() {
  const candidates = [
    path.join(APP_ICONS_DIR, "app.ico"),
    path.join(APP_ICONS_DIR, "noelle_256.png"),
    path.join(APP_ICONS_DIR, "noelle_128.png"),
    path.join(APP_ICONS_DIR, "noelle_64.png"),
    path.join(APP_ICONS_DIR, "noelle_32.png"),
    path.join(APP_ICONS_DIR, "noelle_16.png")
  ];
  return candidates.find((file) => fileExists(file)) || null;
}
function getTrayImage() {
  const iconPath = getAppIconPath();
  if (!iconPath) return null;
  const image = nativeImage.createFromPath(iconPath);
  if (!image || image.isEmpty()) return null;
  if (process.platform === "win32") return image.resize({ width: 16, height: 16 });
  return image;
}
function showMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) createMainWindow();
  if (mainWin) {
    mainWin.show();
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
}
function toggleMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWin.isVisible()) mainWin.hide();
  else showMainWindow();
}
function updateTrayMenu() {
  if (!tray) return;
  const avatarOpen = !!(avatarWin && !avatarWin.isDestroyed() && avatarWin.isVisible());
  const menu = Menu.buildFromTemplate([
    { label: "Mostrar/Ocultar Noelle", click: () => toggleMainWindow() },
    { label: avatarOpen ? "Mostrar widget/avatar" : "Abrir widget/avatar", click: () => createAvatarWindow({ show: true }) },
    { label: "Centralizar avatar", click: () => sendAvatarCommand("center", {}) },
    { label: "Parar emote", click: () => sendAvatarCommand("stop", {}) },
    { type: "separator" },
    { label: "Status: " + (runtime.lastStatus || "iniciando"), enabled: false },
    { type: "separator" },
    { label: "Sair da Noelle", click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}
function createTrayIcon() {
  if (tray) return tray;
  const image = getTrayImage();
  if (!image) {
    appendLog("tray_icon_missing", { expected: "assets/icons/app.ico" });
    return null;
  }
  tray = new Tray(image);
  tray.setToolTip("Noelle IA");
  tray.on("click", () => toggleMainWindow());
  tray.on("double-click", () => {
    showMainWindow();
    createAvatarWindow({ show: true });
  });
  updateTrayMenu();
  return tray;
}
`;

  if (!text.includes("function createTrayIcon")) {
    text = insertBefore(text, "function createMainWindow", helpers);
  }

  if (!text.includes("app.setAppUserModelId")) {
    text = text.replace("app.whenReady().then(() => {", 'app.whenReady().then(() => { if (process.platform === "win32") { try { app.setAppUserModelId("com.masoritech.noelle"); } catch (_) {} }');
  }

  text = text.replace(/new BrowserWindow\(\{\s*/g, (match, offset) => {
    const preview = text.slice(offset, offset + 220);
    if (preview.includes("icon:")) return match;
    return match + "icon: getAppIconPath(), ";
  });

  if (!text.includes("mainWin.on(\"close\"")) {
    text = text.replace(
      'mainWin.on("closed", () => { mainWin = null; });',
      'mainWin.on("close", (event) => { if (!isQuitting) { event.preventDefault(); mainWin.hide(); updateTrayMenu(); } }); mainWin.on("closed", () => { mainWin = null; });'
    );
  }

  if (!text.includes("createTrayIcon(); createMainWindow();")) {
    text = text.replace("createMainWindow(); app.on(\"activate\"", "createTrayIcon(); createMainWindow(); app.on(\"activate\"");
  }

  const normalizer =
`function normalizeAvatarCommandPayload(command, payload = {}) {
  const entry = payload && typeof payload === "object" ? payload : {};
  const raw = String(command || entry.command || entry.type || "").trim();
  const key = raw.toLowerCase();
  const pickId = (...names) => {
    for (const name of names) {
      const value = entry?.[name];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    if (entry?.file) return String(entry.file).replace(/\\\\/g, "/").split("/").pop().replace(/\\.[^.]+$/, "");
    return "";
  };
  const id = pickId("id", "motionId", "itemId", "expressionId", "value", "name", "label", "file");

  if (key === "motion" || key === "emote" || key === "playmotion") return { type: "playMotion", motionId: id, source: entry };
  if (key === "expression" || key === "setexpression" || key === "showexpression") return { type: "showExpression", expressionId: id, source: entry };
  if (key === "item" || key === "equip" || key === "equipitem") return { type: "equipItem", itemId: id, slot: entry.slot || entry.meta?.slot || "right_hand", source: entry };
  if (key === "camera" || key === "preset" || key === "setpreset") return { type: "setPreset", preset: entry.value || entry.preset || entry.id || "full", source: entry };
  if (key === "center" || key === "centeravatar") return { type: "centerAvatar" };
  if (key === "pause" || key === "togglepausemotion") return { type: "togglePauseMotion" };
  if (key === "stop" || key === "stopmotion") return { type: "stopMotion" };
  if (key === "clearitems" || key === "clearavataritems") return { type: "clearAvatarItems" };
  if (key === "rotateleft") return { type: "rotateAvatar", deltaY: -0.15 };
  if (key === "rotateright") return { type: "rotateAvatar", deltaY: 0.15 };
  if (key === "resetrotation" || key === "resetavatarrotation") return { type: "resetAvatarRotation" };
  return entry.type ? entry : { type: raw || "noop", source: entry };
}
function emitAvatarCommandPayload(win, payload) {
  try { win.webContents.send("avatar:command", payload); } catch (_) {}
  try { win.webContents.send("avatar-command", payload); } catch (_) {}
}
`;

  if (!text.includes("function normalizeAvatarCommandPayload")) {
    text = insertBefore(text, "function sendAvatarCommand", normalizer);
  }

  const sendFn =
`function sendAvatarCommand(command, payload = {}) {
  const win = createAvatarWindow({ show: true });
  const avatarPayload = normalizeAvatarCommandPayload(command, payload);
  const data = { command, payload, avatarPayload, at: Date.now() };
  runtime.lastAvatarCommand = data;
  updateTrayMenu();
  const emit = () => setTimeout(() => emitAvatarCommandPayload(win, avatarPayload), 250);
  if (win.webContents.isLoading()) win.webContents.once("did-finish-load", emit);
  else emit();
  return { ok: true, sent: data };
}`;
  text = replaceFunction(text, "sendAvatarCommand", sendFn);

  backupAndWrite(rel, text);
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) return fail("preload.js nao encontrado.");
  let text = read(rel);

  if (text.includes('ipcRenderer.on("avatar:command", listener); return () => ipcRenderer.removeListener("avatar:command", listener);')) {
    text = text.replace(
      'ipcRenderer.on("avatar:command", listener); return () => ipcRenderer.removeListener("avatar:command", listener);',
      'ipcRenderer.on("avatar:command", listener); ipcRenderer.on("avatar-command", listener); return () => { ipcRenderer.removeListener("avatar:command", listener); ipcRenderer.removeListener("avatar-command", listener); };'
    );
  }

  backupAndWrite(rel, text);
}

function patchAvatarWindowApp() {
  const rel = "src/renderer/avatar_window_app.js";
  if (!exists(rel)) return fail("src/renderer/avatar_window_app.js nao encontrado.");
  let text = read(rel);

  text = text.replace(
    'mapped.push({ file: assetUrl, label: item.label || item.file });',
    'mapped.push({ id: item.id || String(item.file || "").replace(/\\.[^.]+$/, ""), file: assetUrl, label: item.label || item.file });'
  );

  if (!text.includes("function showExpressionById")) {
    const fn =
`function showExpressionById(expressionId) {
  if (!expressionDefs.length) return;
  const key = String(expressionId || "").toLowerCase();
  const chosen = expressionDefs.find((item) => {
    const haystack = [item.id, item.label, item.file].map((value) => String(value || "").toLowerCase()).join(" ");
    return key && haystack.includes(key);
  }) || expressionDefs[0];
  const overlay = byId("expressionOverlay");
  const image = byId("expressionImage");
  const badge = byId("expressionBadge");
  if (!overlay || !image || !badge || !chosen) return;
  image.src = chosen.file;
  badge.textContent = chosen.label || chosen.id || "Expressão";
  overlay.classList.add("show");
  badge.classList.add("show");
  clearTimeout(expressionHideTimer);
  expressionHideTimer = setTimeout(() => hideExpression(), 8500);
  setStatus("Expressão: " + (chosen.label || chosen.id || "ativa"));
}
`;
    text = insertBefore(text, "function startExpressionLoop()", fn);
  }

  if (!text.includes('case "showExpression":')) {
    text = text.replace(
      'case "playMotion": await playMotion(loader, payload.motionId); break;',
      'case "playMotion": await playMotion(loader, payload.motionId); break; case "showExpression": case "setExpression": showExpressionById(payload.expressionId || payload.id || payload.label || payload.file); break;'
    );
  }

  backupAndWrite(rel, text);
}

function patchPackage() {
  const rel = "package.json";
  if (!exists(rel)) return fail("package.json nao encontrado.");
  let pkg;
  try { pkg = JSON.parse(read(rel)); } catch (err) { return fail("package.json invalido: " + err.message); }

  backup(rel);
  pkg.version = VERSION;
  pkg.scripts = {
    ...(pkg.scripts || {}),
    start: "electron .",
    diagnostico: "node scripts/diagnostico_v17_4_tray.cjs",
    doctor: "node scripts/diagnostico_v17_4_tray.cjs",
    check: "node --check main.js && node --check preload.js && node --check scripts/diagnostico_v17_4_tray.cjs && node --check src/renderer/controls_window_app.js && node --check src/renderer/avatar_window_app.js"
  };

  pkg.build = pkg.build || {};
  pkg.build.win = pkg.build.win || {};
  pkg.build.win.icon = "assets/icons/app.ico";

  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    three: pkg.dependencies?.three && pkg.dependencies.three !== "latest" ? pkg.dependencies.three : "0.184.0",
    "@pixiv/three-vrm": pkg.dependencies?.["@pixiv/three-vrm"] && pkg.dependencies["@pixiv/three-vrm"] !== "latest" ? pkg.dependencies["@pixiv/three-vrm"] : "3.5.2",
    "@pixiv/three-vrm-animation": pkg.dependencies?.["@pixiv/three-vrm-animation"] && pkg.dependencies["@pixiv/three-vrm-animation"] !== "latest" ? pkg.dependencies["@pixiv/three-vrm-animation"] : "3.5.2"
  };

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json atualizado para V17.4.");
}

function patchMemoryFile() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  let text = exists(rel) ? read(rel) : "# MEMÓRIA GPT — PROJETO NOELLE IA\n";
  if (!text.includes("## Bandeja do sistema")) {
    text += `

## Bandeja do sistema

A Noelle tinha um ícone bonito na bandeja do Windows e isso deve ser preservado.

Arquivos e pontos importantes:

\`\`\`txt
assets/icons/app.ico
assets/icons/noelle_16.png
assets/icons/noelle_32.png
assets/icons/noelle_48.png
assets/icons/noelle_128.png
assets/icons/noelle_256.png
main.js
Electron Tray
Electron Menu
app.setAppUserModelId(...)
BrowserWindow({ icon: ... })
\`\`\`

Comportamento esperado:

\`\`\`txt
- Ícone aparece na bandeja do sistema.
- Clique no ícone mostra/oculta a janela principal.
- Duplo clique mostra a janela principal e abre o widget/avatar.
- Menu da bandeja tem:
  Mostrar/Ocultar Noelle
  Abrir widget/avatar
  Centralizar avatar
  Parar emote
  Sair da Noelle
- Fechar a janela principal deve esconder na bandeja, não encerrar tudo.
- Sair de verdade deve ser pelo menu da bandeja ou opção explícita.
\`\`\`

Não remover a bandeja ao mexer em main.js.
`;
  }
  backupAndWrite(rel, text);
}

function createAvatarAlias() {
  if (exists("src/avatar.html")) return;
  write("src/avatar.html", `<!doctype html>
<meta charset="utf-8">
<title>Noelle Avatar Alias</title>
<script>location.replace("avatar_view.html");</script>
<p>Redirecionando para avatar_view.html...</p>
`);
  log("[OK] Criado alias: src/avatar.html -> avatar_view.html");
}

function runCheck(rel) {
  if (!exists(rel)) return true;
  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    fail("node --check falhou: " + rel);
    return false;
  }
  log("[OK] node --check " + rel);
  return true;
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  patchMain();
  patchPreload();
  patchAvatarWindowApp();
  patchPackage();
  patchMemoryFile();
  createAvatarAlias();

  runCheck("main.js");
  runCheck("preload.js");
  runCheck("src/renderer/avatar_window_app.js");
  runCheck("src/renderer/controls_window_app.js");
  runCheck("scripts/diagnostico_v17_4_tray.cjs");

  log("");
  log("[OK] V17.4 aplicada.");
  log("[INFO] Bandeja restaurada: clique mostra/oculta, duplo clique abre widget.");
}

if (process.argv.includes("--apply")) {
  apply();
} else {
  console.log("Uso: node scripts/hotfix_v17_4_tray_widget_interactions.cjs --apply");
}
