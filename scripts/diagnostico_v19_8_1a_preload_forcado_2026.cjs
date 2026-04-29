#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let ok = true;

function log(msg) { console.log(msg); }
function err(msg) { console.error(`[ERRO] ${msg}`); ok = false; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function nodeCheck(rel) {
  if (!exists(rel)) return err(`Arquivo ausente: ${rel}`);
  const res = cp.spawnSync(process.execPath, ["--check", rel], { cwd: ROOT, encoding: "utf8" });
  if (res.status !== 0) {
    err(`node --check falhou: ${rel}`);
    if (res.stderr) console.error(res.stderr.trim());
  } else {
    log(`[OK] node --check ${rel}`);
  }
}
function mustContain(text, label, needle) {
  if (!text.includes(needle)) err(`${label} não contém: ${needle}`);
  else log(`[OK] ${label} contém: ${needle}`);
}
function mustNotContain(text, label, needle) {
  if (text.includes(needle)) err(`${label} ainda contém legado proibido: ${needle}`);
  else log(`[OK] ${label} sem legado: ${needle}`);
}

log("================================================================");
log(" Noelle V19.8.1a - diagnóstico Preload Forçado");
log("================================================================");

nodeCheck("preload.js");
nodeCheck("scripts/repair_v19_8_1a_preload_forcado_2026.cjs");

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    const version = String(pkg.version || "");
    if (version.includes("19.8.1a")) log(`[OK] package.json version: ${version}`);
    else err(`package.json version não está em V19.8.1a: ${version}`);
  } catch (e) {
    err(`package.json inválido: ${e.message}`);
  }
} else {
  err("package.json ausente");
}

if (exists("preload.js")) {
  const preload = read("preload.js");
  mustContain(preload, "preload.js", "contextBridge.exposeInMainWorld(\"noelleAPI\"");
  mustContain(preload, "preload.js", "contextBridge.exposeInMainWorld(\"desktopWidget\"");
  mustContain(preload, "preload.js", "contextBridge.exposeInMainWorld(\"noelleRoom\"");
  mustContain(preload, "preload.js", "contextBridge.exposeInMainWorld(\"noelleRoomV19\"");

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
  for (const item of forbidden) mustNotContain(preload, "preload.js", item);
}

if (exists("src/controls.html")) {
  const html = read("src/controls.html");
  mustNotContain(html, "src/controls.html", "avatar_v19_5_panel_bootstrap.js");
  mustNotContain(html, "src/controls.html", "noelle_v19_3_complete_ui_md.js");
} else {
  err("src/controls.html ausente");
}

if (exists("iniciar.bat")) {
  const bat = read("iniciar.bat");
  mustNotContain(bat, "iniciar.bat", "Activate.ps1");
  mustNotContain(bat, "iniciar.bat", "Set-ExecutionPolicy");
  if (/\[1\]|Iniciar programa/i.test(bat) && /npm\.cmd start|npm start|npx\.cmd electron/i.test(bat)) {
    log("[OK] iniciar.bat contém opção de iniciar programa.");
  } else {
    err("iniciar.bat não parece conter opção clara para iniciar programa.");
  }
} else {
  err("iniciar.bat ausente");
}

if (exists("src/assets/avatar_manifest.json")) {
  try {
    const manifest = JSON.parse(read("src/assets/avatar_manifest.json"));
    if (Array.isArray(manifest) && manifest.length > 0) log(`[OK] avatar_manifest.json contém ${manifest.length} avatar(es)`);
    else err("avatar_manifest.json existe, mas está vazio ou não é lista");
  } catch (e) {
    err(`avatar_manifest.json inválido: ${e.message}`);
  }
} else {
  log("[AVISO] src/assets/avatar_manifest.json ausente. Isso será tratado na fase Avatar/Manifest.");
}

if (ok) {
  log("\n[OK] Diagnóstico V19.8.1a aprovado.");
} else {
  log("\n[ERRO] Diagnóstico V19.8.1a encontrou problemas.");
  process.exitCode = 1;
}
