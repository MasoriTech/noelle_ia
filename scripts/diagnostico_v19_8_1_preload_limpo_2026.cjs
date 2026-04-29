#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
let failed = false;

function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function fail(msg) { console.error(`[ERRO] ${msg}`); failed = true; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function checkNodeSyntax(rel) {
  const { spawnSync } = require("child_process");
  if (!exists(rel)) return fail(`Arquivo ausente: ${rel}`);
  const r = spawnSync(process.execPath, ["--check", rel], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) ok(`node --check ${rel}`);
  else fail(`node --check falhou: ${rel}\n${r.stderr || r.stdout}`);
}

console.log("================================================================");
console.log(" Noelle V19.8.1 - diagnóstico Preload Limpo");
console.log("================================================================");

checkNodeSyntax("preload.js");
checkNodeSyntax("scripts/repair_v19_8_1_preload_limpo_2026.cjs");

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (String(pkg.version || "").includes("19.8.1")) ok(`package.json version: ${pkg.version}`);
    else warn(`package.json version ainda não é V19.8.1: ${pkg.version || "sem versão"}`);
  } catch (err) {
    fail(`package.json inválido: ${err.message}`);
  }
} else {
  fail("package.json ausente");
}

const preload = exists("preload.js") ? read("preload.js") : "";
const forbiddenInPreload = [
  "noelle_v19_3_complete_ui_md.js",
  "avatar_v19_5_panel_bootstrap.js",
  "noelle-v19-3-complete-runtime-script",
  "noelle-v19-5-avatar-panel-script",
  "NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN",
  "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN"
];
for (const token of forbiddenInPreload) {
  if (preload.includes(token)) fail(`preload.js ainda contém injeção visual legada: ${token}`);
}
if (/exposeInMainWorld\(\s*["']noelleAPI["']/.test(preload)) ok("window.noelleAPI preservado");
else fail("window.noelleAPI não encontrado no preload.js");
if (/exposeInMainWorld\(\s*["']desktopWidget["']/.test(preload)) ok("window.desktopWidget preservado");
else fail("window.desktopWidget não encontrado no preload.js");
if (/exposeInMainWorld\(\s*["']noelleRoom["']/.test(preload)) ok("window.noelleRoom preservado");
else fail("window.noelleRoom não encontrado no preload.js");
if (/exposeInMainWorld\(\s*["']noelleRoomV19["']/.test(preload)) ok("window.noelleRoomV19 compatível sem UI legada");
else warn("window.noelleRoomV19 não exposto; ok se nada depender dele, mas compatibilidade pode faltar");

if (exists("src/controls.html")) {
  const controls = read("src/controls.html");
  for (const token of ["noelle_v19_3_complete_ui_md.js", "avatar_v19_5_panel_bootstrap.js"]) {
    if (controls.includes(token)) fail(`src/controls.html ainda carrega runtime visual legado: ${token}`);
  }
  ok("src/controls.html sem script tag visual legada conhecida");
} else {
  warn("src/controls.html não encontrado para verificar script tags");
}

const manifestCandidates = [
  "src/assets/avatar_manifest.json",
  "src/assets/avatars/avatar_manifest.json"
];
const manifest = manifestCandidates.find(exists);
if (manifest) {
  try {
    const parsed = JSON.parse(read(manifest));
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.avatars) ? parsed.avatars : [];
    if (arr.length) ok(`${manifest} contém ${arr.length} avatar(es)`);
    else warn(`${manifest} existe, mas não lista avatares`);
  } catch (err) {
    warn(`${manifest} não pôde ser lido como JSON: ${err.message}`);
  }
} else {
  warn("avatar_manifest.json ainda não encontrado; isso será tratado na fase Avatar real/carrossel");
}

if (failed) {
  console.error("\n[ERRO] Diagnóstico V19.8.1 encontrou problemas.");
  process.exit(1);
}
console.log("\n[OK] Diagnóstico V19.8.1 aprovado.");
