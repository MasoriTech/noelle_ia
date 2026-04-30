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

console.log("================================================================");
console.log(" Diagnóstico V19.8.24 - main");
console.log("================================================================");

nodeCheck("main.js");
nodeCheck("scripts/repair_v19_8_24_clean_maintenance_2026.cjs");

if (exists("main.js")) {
  const main = read("main.js");

  if (main.includes("NOELLE_V19_8_24_IMPORT_AVATAR_MAIN_BEGIN")) ok("main.js contém bloco importAvatar V19.8.24");
  else err("main.js não contém bloco importAvatar V19.8.24");

  if (!main.includes("NOELLE_V19_8_20_IMPORT_MAIN_BEGIN") && !main.includes("NOELLE_V19_8_21_IMPORT_MAIN_BEGIN")) ok("main.js sem blocos antigos V20/V21 de importAvatar");
  else err("main.js ainda contém blocos antigos V20/V21 de importAvatar");

  if (main.includes("noelle:v19_8_24:import-avatar")) ok("main.js contém canal IPC V19.8.24");
  else err("main.js não contém canal IPC V19.8.24");

  if (main.includes("noelle:v19_8_21:import-avatar") && main.includes("noelle:v19_8_20:import-avatar")) ok("main.js mantém aliases V20/V21");
  else warn("main.js sem aliases V20/V21");
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    const scripts = pkg.scripts || {};
    if (pkg.version === "19.8.24-clean-maintenance-2026") ok("package.json version V19.8.24");
    else warn("package.json version diferente: " + (pkg.version || "(sem version)"));

    ["start", "check", "diagnostico", "diagnostico:main", "diagnostico:preload", "diagnostico:avatar", "repair:v19.8.24-clean"].forEach((name) => {
      if (scripts[name]) ok("package.json contém script " + name);
      else err("package.json sem script " + name);
    });

    const legacyNames = Object.keys(scripts).filter((name) => /v\d+[_\.\-]\d+/i.test(name) && name !== "repair:v19.8.24-clean");
    if (legacyNames.length) warn("package.json ainda contém scripts com versão: " + legacyNames.join(", "));
    else ok("package.json sem scripts V19.x legados visíveis");
  } catch (e) {
    err("package.json inválido: " + e.message);
  }
}

if (exists("docs/SCRIPTS_LEGADOS_V19_8_24.md")) ok("docs/SCRIPTS_LEGADOS_V19_8_24.md existe");
else warn("docs/SCRIPTS_LEGADOS_V19_8_24.md não encontrado");

if (process.exitCode) err("Diagnóstico main V19.8.24 encontrou problemas.");
else ok("Diagnóstico main V19.8.24 aprovado.");
