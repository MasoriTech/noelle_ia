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
  log(" Diagnóstico V19.8.23 - Log queue performance");
  log("================================================================");

  [
    "src/main/performance/log_queue_v19_8_23.cjs",
    "scripts/repair_v19_8_23_log_queue_perf_2026.cjs",
    "scripts/diagnostico_v19_8_23_log_queue_perf_2026.cjs"
  ].forEach(nodeCheck);

  if (!exists("main.js")) {
    err("main.js não encontrado");
  } else {
    const main = read("main.js");

    if (main.includes("log_queue_v19_8_23.cjs")) ok("main.js importa log_queue V19.8.23");
    else err("main.js não importa log_queue V19.8.23");

    if (main.includes("appendNoelleLog(logFile(), message, extra)")) ok("appendLog usa fila assíncrona");
    else warn("appendLog assíncrono não detectado");

    if (!/appendFileSync\(logFile\(\)/.test(main)) ok("main.js sem appendFileSync direto no appendLog");
    else err("main.js ainda usa appendFileSync direto no appendLog");

    if (main.includes("flushNoelleLogsNow")) ok("flushNoelleLogsNow referenciado no main.js");
    else warn("flushNoelleLogsNow não referenciado");

    nodeCheck("main.js");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.scripts && pkg.scripts["repair:v19.8.23-log-queue"]) ok("package.json contém repair:v19.8.23-log-queue");
      else warn("package.json sem script repair:v19.8.23-log-queue");
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

  if (process.exitCode) err("Diagnóstico V19.8.23 encontrou problemas.");
  else ok("Diagnóstico V19.8.23 aprovado.");
}

main();
