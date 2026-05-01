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
  log(" Diagnóstico V19.8.27 - Controls core split");
  log("================================================================");

  [
    "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
    "src/renderer/controls_window_app.js",
    "scripts/repair_v19_8_27_controls_core_split_2026.cjs",
    "scripts/diagnostico_v19_8_27_controls_core_split_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/modules/noelle_renderer_core_v19_8_27.js")) {
    const core = read("src/renderer/modules/noelle_renderer_core_v19_8_27.js");
    if (core.includes("window.NoelleRendererCoreV19827")) ok("módulo core expõe window.NoelleRendererCoreV19827");
    else err("módulo core não expõe window.NoelleRendererCoreV19827");

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(core)) ok("módulo core sem observador ativo/remocao de elemento");
    else err("módulo core contém observador ativo ou remoção real de elemento");
  }

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");

    if (app.includes("NOELLE_V19_8_27_CONTROLS_CORE_SPLIT")) ok("controls_window_app.js marcado com V19.8.27");
    else warn("controls_window_app.js sem marcador V19.8.27");

    const expected = [
      "nowTime",
      "showToast",
      "escapeText",
      "selectHasValue",
      "setGlobalStatus",
      "setChatStatus",
      "autosizeTextarea",
      "scrollChatToBottom",
      "applyTheme",
      "updateAssetSummary"
    ];

    let routed = 0;
    for (const name of expected) {
      const re = new RegExp("function\\s+" + name + "\\s*\\([^)]*\\)\\s*\\{[^}]*NoelleRendererCoreV19827", "s");
      if (re.test(app)) {
        ok(name + " roteado para módulo core");
        routed += 1;
      } else {
        warn(name + " não parece roteado para módulo core");
      }
    }

    if (routed >= 7) ok("Funções core roteadas: " + routed + "/" + expected.length);
    else err("Poucas funções foram roteadas para módulo core: " + routed + "/" + expected.length);
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");
    const coreIndex = html.indexOf("noelle_renderer_core_v19_8_27.js");
    const appIndex = html.indexOf("controls_window_app.js");

    if (coreIndex >= 0) ok("controls.html carrega módulo core V19.8.27");
    else err("controls.html não carrega módulo core V19.8.27");

    if (appIndex >= 0 && coreIndex >= 0 && coreIndex < appIndex) ok("módulo core carrega antes de controls_window_app.js");
    else if (appIndex >= 0) err("módulo core não aparece antes de controls_window_app.js");
    else warn("controls_window_app.js não encontrado no controls.html para validar ordem");
  } else {
    err("src/controls.html não encontrado");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.27-controls-core-split-2026") ok("package.json version V19.8.27");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));

      if (pkg.scripts && pkg.scripts["repair:v19.8.27-controls-core-split"]) ok("package.json contém repair V19.8.27");
      else warn("package.json sem repair V19.8.27");
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.27 encontrou problemas.");
  else ok("Diagnóstico V19.8.27 aprovado.");
}

main();
