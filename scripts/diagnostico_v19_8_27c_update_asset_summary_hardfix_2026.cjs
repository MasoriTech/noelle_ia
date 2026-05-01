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
  log(" Diagnóstico V19.8.27c - updateAssetSummary hardfix");
  log("================================================================");

  [
    "src/renderer/controls_window_app.js",
    "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
    "scripts/repair_v19_8_27c_update_asset_summary_hardfix_2026.cjs",
    "scripts/diagnostico_v19_8_27c_update_asset_summary_hardfix_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");

    if (app.includes("NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX")) ok("controls_window_app marcado com V19.8.27c");
    else warn("controls_window_app sem marcador V19.8.27c");

    const good = /function\s+updateAssetSummary\s*\(\s*counts\s*=\s*\{\}\s*\)\s*\{\s*return\s+window\.NoelleRendererCoreV19827\?\.updateAssetSummary\?\.\(counts\);\s*\}/.test(app);
    if (good) ok("updateAssetSummary está como stub correto");
    else err("updateAssetSummary não está como stub correto");

    const broken = app.includes("function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {");
    if (broken) err("Padrão quebrado de updateAssetSummary ainda existe");
    else ok("Padrão quebrado de updateAssetSummary ausente");

    if (app.includes("NoelleRendererCoreV19827")) ok("controls_window_app usa módulo core");
    else err("controls_window_app não usa módulo core");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.27c-update-asset-summary-hardfix-2026") ok("package.json version V19.8.27c");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.27c encontrou problemas.");
  else ok("Diagnóstico V19.8.27c aprovado.");
}

main();
