#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function err(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado");
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (res.stderr) console.log(res.stderr);
    if (res.stdout) console.log(res.stdout);
  }
}

console.log("================================================================");
console.log(" Diagnóstico V19.8.27d - Diagnostic regex fix");
console.log("================================================================");

[
  "src/renderer/controls_window_app.js",
  "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
  "scripts/repair_v19_8_27d_diag_regex_fix_2026.cjs",
  "scripts/diagnostico_v19_8_27d_diag_regex_fix_2026.cjs"
].forEach(nodeCheck);

if (exists("src/renderer/controls_window_app.js")) {
  const app = read("src/renderer/controls_window_app.js");

  const exactBroken = "function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {";

  if (app.includes(exactBroken)) err("Padrão literal quebrado ainda existe em updateAssetSummary");
  else ok("Padrão literal quebrado ausente");

  if (/function\s+updateAssetSummary\s*\(\s*counts\s*=\s*\{\}\s*\)\s*\{\s*return\s+window\.NoelleRendererCoreV19827\?\.updateAssetSummary\?\.\(counts\);\s*\}/.test(app)) {
    ok("updateAssetSummary está como stub correto");
  } else {
    err("updateAssetSummary não está como stub correto");
  }

  if (app.includes("NoelleRendererCoreV19827")) ok("controls_window_app usa módulo core");
  else err("controls_window_app não usa módulo core");

  if (app.includes("NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX")) ok("marcador V19.8.27c presente");
  else warn("marcador V19.8.27c não encontrado");
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (pkg.version === "19.8.27d-diagnostic-regex-fix-2026") ok("package.json version V19.8.27d");
    else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
  } catch (e) {
    err("package.json inválido: " + e.message);
  }
}

if (process.exitCode) err("Diagnóstico V19.8.27d encontrou problemas.");
else ok("Diagnóstico V19.8.27d aprovado.");
