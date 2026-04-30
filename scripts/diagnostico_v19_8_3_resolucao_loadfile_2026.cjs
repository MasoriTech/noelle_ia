#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
let errors = 0;

function log(msg) { console.log(msg); }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); errors++; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) { err(`${rel} não existe`); return; }
  const result = spawnSync(process.execPath, ["--check", rel], { cwd: ROOT, encoding: "utf8" });
  if (result.status === 0) ok(`node --check ${rel}`);
  else err(`node --check falhou: ${rel}\n${result.stderr || result.stdout}`);
}

function mustContain(rel, needle, label = needle) {
  if (!exists(rel)) { err(`${rel} não existe`); return; }
  if (read(rel).includes(needle)) ok(`${rel} contém: ${label}`);
  else err(`${rel} não contém: ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  if (!exists(rel)) { err(`${rel} não existe`); return; }
  if (!read(rel).includes(needle)) ok(`${rel} sem legado: ${label}`);
  else err(`${rel} ainda contém legado: ${label}`);
}

log("================================================================");
log(" Noelle V19.8.3 - diagnóstico Resolução + LoadFile");
log("================================================================");

nodeCheck("preload.js");
nodeCheck("main.js");
nodeCheck("scripts/repair_v19_8_3_resolucao_loadfile_2026.cjs");
nodeCheck("scripts/diagnostico_v19_8_3_resolucao_loadfile_2026.cjs");
nodeCheck("scripts/status_v19_8_3_resolucao_loadfile_2026.cjs");

for (const rel of [
  "src/styles/noelle_avatar_responsive_v19_8_3.css",
  "src/renderer/noelle_avatar_resize_guard_v19_8_3.js",
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs"
]) {
  if (exists(rel)) ok(`${rel} existe`);
  else err(`${rel} não existe`);
}

nodeCheck("src/renderer/noelle_avatar_resize_guard_v19_8_3.js");

mustContain("preload.js", "openAvatarPreviewLoadFile", "API openAvatarPreviewLoadFile");
mustContain("main.js", "noelle:open-avatar-preview-loadfile", "IPC noelle:open-avatar-preview-loadfile");
mustContain("main.js", ".loadFile(html", "BrowserWindow.loadFile para preview");
mustContain("src/controls.html", "noelle_avatar_responsive_v19_8_3.css", "CSS responsivo V19.8.3");
mustContain("src/controls.html", "noelle_avatar_resize_guard_v19_8_3.js", "runtime responsivo V19.8.3");
mustContain("src/styles/noelle_avatar_responsive_v19_8_3.css", "@media", "breakpoints responsivos");
mustContain("src/styles/noelle_avatar_responsive_v19_8_3.css", "overflow: auto", "scrollbar/overflow");
mustContain("src/styles/noelle_avatar_responsive_v19_8_3.css", "minmax", "grid minmax");
mustContain("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", "Resize", "controle por resize");
mustContain("src/renderer/noelle_avatar_resize_guard_v19_8_3.js", "Preview LoadFile", "botão Preview LoadFile");

for (const legacy of [
  "noelle-v19-5-avatar-panel-script",
  "noelle-v19-3-complete-runtime-script",
  "avatar_v19_5_panel_bootstrap.js",
  "noelle_v19_3_complete_ui_md.js",
  "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN",
  "NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN"
]) {
  mustNotContain("preload.js", legacy, legacy);
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (String(pkg.version || "").includes("19.8.3")) ok(`package.json version: ${pkg.version}`);
    else warn(`package.json version não é V19.8.3: ${pkg.version}`);
  } catch (e) { err("package.json inválido: " + e.message); }
}

if (exists("src/assets/avatar_manifest.json")) {
  try {
    const data = JSON.parse(read("src/assets/avatar_manifest.json"));
    if (Array.isArray(data) && data.length) ok(`avatar_manifest.json array com ${data.length} entrada(s)`);
    else err("avatar_manifest.json não é array ou está vazio");
  } catch (e) { err("avatar_manifest.json inválido: " + e.message); }
} else {
  warn("src/assets/avatar_manifest.json não encontrado");
}

if (exists("iniciar.bat")) {
  const bat = read("iniciar.bat");
  if (bat.includes("[1] Iniciar programa agora")) ok("iniciar.bat contém opção [1] Iniciar programa agora");
  else err("iniciar.bat sem opção [1] Iniciar programa agora");
  if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok("iniciar.bat sem PowerShell/Activate.ps1");
  else err("iniciar.bat ainda contém Activate.ps1 ou Set-ExecutionPolicy");
} else {
  err("iniciar.bat não existe");
}

if (errors) {
  console.error(`\n[ERRO] Diagnóstico V19.8.3 encontrou ${errors} problema(s).`);
  process.exit(1);
}
console.log("\n[OK] Diagnóstico V19.8.3 aprovado.");
