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

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.27b - Controls syntax fix");
  log("================================================================");

  [
    "src/renderer/controls_window_app.js",
    "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
    "scripts/repair_v19_8_27b_controls_syntax_fix_2026.cjs",
    "scripts/diagnostico_v19_8_27b_controls_syntax_fix_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");

    if (app.includes("NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX")) ok("controls_window_app marcado com V19.8.27b");
    else warn("controls_window_app sem marcador V19.8.27b");

    if (/function\s+updateAssetSummary\s*\(\s*counts\s*=\s*\{\}\s*\)\s*\{\s*return\s+window\.NoelleRendererCoreV19827\?\.updateAssetSummary\?\.\(counts\);\s*\}/.test(app)) {
      ok("updateAssetSummary está como stub correto");
    } else {
      err("updateAssetSummary não está no formato esperado");
    }

    if (/updateAssetSummary\s*\([^)]*\)\s*\{[^\n]*\}\)\s*\{/.test(app)) {
      err("Padrão quebrado ainda existe em updateAssetSummary");
    } else {
      ok("Padrão quebrado de updateAssetSummary ausente");
    }

    if (app.includes("NoelleRendererCoreV19827")) ok("controls_window_app usa módulo core");
    else err("controls_window_app não usa módulo core");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.27b-controls-syntax-fix-2026") ok("package.json version V19.8.27b");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.27b encontrou problemas.");
  else ok("Diagnóstico V19.8.27b aprovado.");
}

main();
