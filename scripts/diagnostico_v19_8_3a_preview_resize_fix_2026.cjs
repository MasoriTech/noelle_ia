#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { warnings++; console.log("[AVISO] " + msg); }
function err(msg) { errors++; console.log("[ERRO] " + msg); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function contains(rel, needle, label) {
  if (!exists(rel)) { err(`${rel} não existe`); return false; }
  const text = read(rel);
  if (text.includes(needle)) { ok(`${rel} contém: ${label || needle}`); return true; }
  err(`${rel} não contém: ${label || needle}`);
  return false;
}

function notContains(rel, needle, label) {
  if (!exists(rel)) { err(`${rel} não existe`); return false; }
  const text = read(rel);
  if (!text.includes(needle)) { ok(`${rel} sem legado: ${label || needle}`); return true; }
  err(`${rel} ainda contém legado: ${label || needle}`);
  return false;
}

function nodeCheck(rel) {
  if (!exists(rel)) { err(`${rel} não existe`); return; }
  const cp = require("child_process").spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (cp.status === 0) ok(`node --check ${rel}`);
  else err(`node --check falhou: ${rel}\n${cp.stderr || cp.stdout}`);
}

console.log("================================================================");
console.log(" Noelle V19.8.3a - diagnóstico Preview LoadFile + Resize");
console.log("================================================================");

nodeCheck("preload.js");
nodeCheck("src/renderer/noelle_avatar_resize_guard_v19_8_3.js");
nodeCheck("scripts/repair_v19_8_3a_preview_resize_fix_2026.cjs");

contains("preload.js", 'contextBridge.exposeInMainWorld("noelleAPI"', "noelleAPI");
contains("preload.js", 'contextBridge.exposeInMainWorld("desktopWidget"', "desktopWidget");
contains("preload.js", 'contextBridge.exposeInMainWorld("noelleRoom"', "noelleRoom");
contains("preload.js", 'contextBridge.exposeInMainWorld("noelleRoomV19"', "noelleRoomV19");
contains("preload.js", "openAvatarPreviewLoadFile", "API openAvatarPreviewLoadFile");
contains("preload.js", 'noelle:open-avatar-preview-loadfile', "IPC noelle:open-avatar-preview-loadfile");

[
  "noelle-v19-5-avatar-panel-script",
  "noelle-v19-3-complete-runtime-script",
  "avatar_v19_5_panel_bootstrap.js",
  "noelle_v19_3_complete_ui_md.js",
  "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN",
  "NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN",
  'document.createElement("script")',
  "appendChild(script)"
].forEach((token) => notContains("preload.js", token));

contains("main.js", "noelle:open-avatar-preview-loadfile", "IPC Preview LoadFile");
contains("main.js", ".loadFile(", "BrowserWindow.loadFile");

contains("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", "controle por resize", "controle por resize");
contains("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", 'window.addEventListener("resize"', "window resize listener");
contains("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", "applyAvatarResponsiveMode", "função responsiva");
contains("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", "Preview LoadFile", "botão Preview LoadFile");

contains("src/controls.html", "noelle_avatar_resize_guard_v19_8_3.js", "resize guard carregado");

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (String(pkg.version || "").includes("19.8.3a")) ok(`package.json version: ${pkg.version}`);
    else warn(`package.json version não é 19.8.3a: ${pkg.version}`);
    if (pkg.scripts && pkg.scripts["diagnostico:v19.8.3a"]) ok("package.json contém diagnostico:v19.8.3a");
    else warn("package.json não contém diagnostico:v19.8.3a");
  } catch (e) {
    err("package.json inválido: " + e.message);
  }
} else {
  err("package.json não existe");
}

if (exists("src/assets/avatar_manifest.json")) {
  try {
    const manifest = JSON.parse(read("src/assets/avatar_manifest.json"));
    if (Array.isArray(manifest) && manifest.length) ok(`avatar_manifest.json array com ${manifest.length} entrada(s)`);
    else warn("avatar_manifest.json não é array com entradas; isso não bloqueia este patch, mas bloqueia carrossel se estiver vazio.");
  } catch (e) {
    warn("avatar_manifest.json inválido: " + e.message);
  }
} else {
  warn("src/assets/avatar_manifest.json não existe.");
}

if (exists("iniciar.bat")) {
  const bat = read("iniciar.bat");
  if (bat.includes("[1] Iniciar programa agora")) ok("iniciar.bat contém opção [1] Iniciar programa agora");
  else warn("iniciar.bat não contém texto exato da opção [1]");
  if (!bat.includes("Activate.ps1") && !bat.includes("Set-ExecutionPolicy")) ok("iniciar.bat sem PowerShell/Activate.ps1");
  else err("iniciar.bat ainda contém Activate.ps1 ou Set-ExecutionPolicy");
} else {
  err("iniciar.bat não existe");
}

if (errors) {
  console.log(`\n[ERRO] Diagnóstico V19.8.3a encontrou ${errors} problema(s).`);
  process.exit(1);
}
console.log(`\n[OK] Diagnóstico V19.8.3a aprovado.${warnings ? ` Avisos: ${warnings}.` : ""}`);
