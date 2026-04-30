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

function extractAppendLog(main) {
  const idx = main.search(/function\s+appendLog\s*\(/);
  if (idx < 0) return "";
  return main.slice(idx, idx + 500);
}

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.23a - Log queue fix");
  log("================================================================");

  [
    "src/main/performance/log_queue_v19_8_23.cjs",
    "scripts/repair_v19_8_23a_log_queue_fix_2026.cjs",
    "scripts/diagnostico_v19_8_23a_log_queue_fix_2026.cjs"
  ].forEach(nodeCheck);

  if (!exists("main.js")) {
    err("main.js não encontrado");
  } else {
    const mainCode = read("main.js");
    const appendBlock = extractAppendLog(mainCode);

    if (mainCode.includes("log_queue_v19_8_23.cjs")) ok("main.js importa log_queue V19.8.23");
    else err("main.js não importa log_queue V19.8.23");

    if (appendBlock.includes("appendNoelleLog(logFile(), message, extra)")) ok("appendLog usa fila assíncrona");
    else {
      err("appendLog assíncrono não detectado");
      console.log("----- appendLog encontrado -----");
      console.log(appendBlock || "(não encontrado)");
      console.log("-------------------------------");
    }

    if (/function\s+appendLog[\s\S]{0,500}appendFileSync\s*\(/.test(mainCode)) {
      err("appendLog ainda usa appendFileSync");
    } else {
      ok("appendLog sem appendFileSync");
    }

    if (mainCode.includes("flushNoelleLogsNow")) ok("flushNoelleLogsNow referenciado no main.js");
    else warn("flushNoelleLogsNow não referenciado");

    nodeCheck("main.js");
  }

  if (exists("iniciar.bat")) {
    const bat = read("iniciar.bat");
    if (bat.includes("[1] Iniciar programa agora")) ok("iniciar.bat contém opção [1]");
    else err("iniciar.bat sem opção [1]");
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok("iniciar.bat sem PowerShell/Activate.ps1");
    else err("iniciar.bat contém PowerShell/Activate.ps1");
  }

  if (process.exitCode) err("Diagnóstico V19.8.23a encontrou problemas.");
  else ok("Diagnóstico V19.8.23a aprovado.");
}

main();
