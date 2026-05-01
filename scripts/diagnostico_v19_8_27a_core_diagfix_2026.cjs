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
  }
}

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.27a - Core diagfix");
  log("================================================================");

  [
    "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
    "src/renderer/controls_window_app.js",
    "scripts/repair_v19_8_27a_core_diagfix_2026.cjs",
    "scripts/diagnostico_v19_8_27a_core_diagfix_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/modules/noelle_renderer_core_v19_8_27.js")) {
    const core = read("src/renderer/modules/noelle_renderer_core_v19_8_27.js");

    if (core.includes("window.NoelleRendererCoreV19827")) ok("módulo core expõe window.NoelleRendererCoreV19827");
    else err("módulo core não expõe window.NoelleRendererCoreV19827");

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(core)) {
      ok("módulo core sem observador ativo ou remoção real de elemento");
    } else {
      err("módulo core contém observador ativo ou remoção real de elemento");
    }

    if (!/classList\.remove\s*\(/.test(core)) ok("módulo core sem classList.remove");
    else warn("módulo core ainda contém classList.remove; isso não remove DOM, mas pode ativar diagnóstico antigo");
  }

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");
    if (app.includes("NoelleRendererCoreV19827")) ok("controls_window_app usa módulo core V19.8.27");
    else err("controls_window_app não usa módulo core V19.8.27");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");
    if (html.includes("noelle_renderer_core_v19_8_27.js")) ok("controls.html carrega módulo core");
    else err("controls.html não carrega módulo core");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.27a-controls-core-diagfix-2026") ok("package.json version V19.8.27a");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.27a encontrou problemas.");
  else ok("Diagnóstico V19.8.27a aprovado.");
}

main();
