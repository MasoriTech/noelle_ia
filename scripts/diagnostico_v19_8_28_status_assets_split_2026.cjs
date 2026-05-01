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
  log(" Diagnóstico V19.8.28 - Status/Assets split");
  log("================================================================");

  [
    "src/renderer/modules/noelle_status_assets_v19_8_28.js",
    "src/renderer/controls_window_app.js",
    "scripts/repair_v19_8_28_status_assets_split_2026.cjs",
    "scripts/diagnostico_v19_8_28_status_assets_split_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/modules/noelle_status_assets_v19_8_28.js")) {
    const mod = read("src/renderer/modules/noelle_status_assets_v19_8_28.js");
    if (mod.includes("window.NoelleStatusAssetsV19828")) ok("módulo status/assets expõe window.NoelleStatusAssetsV19828");
    else err("módulo status/assets não expõe window.NoelleStatusAssetsV19828");

    if (mod.includes("async function refreshStatus") && mod.includes("async function loadAssets")) ok("módulo contém refreshStatus/loadAssets");
    else err("módulo não contém refreshStatus/loadAssets");

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(mod)) ok("módulo sem observer/remove DOM");
    else err("módulo contém observer ou remoção real de DOM");
  }

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");

    if (app.includes("NOELLE_V19_8_28_STATUS_ASSETS_SPLIT")) ok("controls_window_app marcado com V19.8.28");
    else warn("controls_window_app sem marcador V19.8.28");

    if (/async\s+function\s+refreshStatus\s*\([^)]*\)\s*\{[^}]*NoelleStatusAssetsV19828/.test(app)) ok("refreshStatus roteado para módulo status/assets");
    else err("refreshStatus não está roteado para módulo status/assets");

    if (/async\s+function\s+loadAssets\s*\([^)]*\)\s*\{[^}]*NoelleStatusAssetsV19828/.test(app)) ok("loadAssets roteado para módulo status/assets");
    else err("loadAssets não está roteado para módulo status/assets");

    if (app.includes("NoelleRendererCoreV19827")) ok("módulo core V19.8.27 preservado");
    else warn("módulo core V19.8.27 não detectado");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");
    const modIndex = html.indexOf("noelle_status_assets_v19_8_28.js");
    const appIndex = html.indexOf("controls_window_app.js");

    if (modIndex >= 0) ok("controls.html carrega módulo status/assets V19.8.28");
    else err("controls.html não carrega módulo status/assets V19.8.28");

    if (appIndex >= 0 && modIndex >= 0 && modIndex < appIndex) ok("módulo status/assets carrega antes de controls_window_app.js");
    else if (appIndex >= 0) err("módulo status/assets não aparece antes de controls_window_app.js");
    else warn("controls_window_app.js não encontrado no controls.html para validar ordem");
  } else {
    err("src/controls.html não encontrado");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.28-status-assets-split-2026") ok("package.json version V19.8.28");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.28 encontrou problemas.");
  else ok("Diagnóstico V19.8.28 aprovado.");
}

main();
