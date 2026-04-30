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
  if (!exists(rel)) {
    err(rel + " não encontrado");
    return;
  }
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
  log(" Diagnóstico V19.8.22 - Main performance modular");
  log("================================================================");

  [
    "src/main/performance/ollama_http_agent_v19_8_22.cjs",
    "src/main/performance/safe_json_v19_8_22.cjs",
    "scripts/repair_v19_8_22_main_perf_modular_2026.cjs",
    "scripts/diagnostico_v19_8_22_main_perf_modular_2026.cjs"
  ].forEach(nodeCheck);

  if (!exists("main.js")) {
    err("main.js não encontrado");
  } else {
    const main = read("main.js");

    if (main.includes('ollama_http_agent_v19_8_22.cjs')) ok("main.js importa ollama_http_agent");
    else err("main.js não importa ollama_http_agent");

    if (main.includes('safe_json_v19_8_22.cjs')) ok("main.js importa safe_json");
    else err("main.js não importa safe_json");

    if (main.includes("agent: OLLAMA_HTTP_AGENT")) ok("ollamaRequest usa keep-alive agent");
    else warn("ollamaRequest não parece usar keep-alive agent");

    if (main.includes("writeJsonAtomic(file, value)")) ok("writeJson usa escrita atômica");
    else warn("writeJson atômico não detectado");

    if (main.includes("__NOELLE_V19_8_22_STATE_CACHE")) ok("cache curto de estado detectado");
    else warn("cache curto de estado não detectado");

    nodeCheck("main.js");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.scripts && pkg.scripts["repair:v19.8.22-main-perf"]) ok("package.json contém repair:v19.8.22-main-perf");
      else warn("package.json sem script repair:v19.8.22-main-perf");
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (exists("iniciar.bat")) {
    const bat = read("iniciar.bat");
    if (bat.includes("[1] Iniciar programa agora")) ok("iniciar.bat contém opção [1]");
    else err("iniciar.bat sem opção [1]");
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok("iniciar.bat sem PowerShell/Activate.ps1");
    else err("iniciar.bat contém PowerShell/Activate.ps1");
  }

  if (process.exitCode) err("Diagnóstico V19.8.22 encontrou problemas.");
  else ok("Diagnóstico V19.8.22 aprovado.");
}

main();
