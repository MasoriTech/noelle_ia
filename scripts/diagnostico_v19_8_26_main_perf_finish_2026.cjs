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
  if (!exists(rel)) return err(rel + " nao encontrado");
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (res.stderr) console.log(res.stderr);
  }
}

function extractFunction(code, name) {
  const idx = code.search(new RegExp("function\\s+" + name + "\\s*\\("));
  if (idx < 0) return "";
  return code.slice(idx, idx + 1100);
}

function main() {
  log("================================================================");
  log(" Diagnostico V19.8.26 - Main performance finish");
  log("================================================================");

  [
    "src/main/performance/ollama_http_agent_v19_8_22.cjs",
    "src/main/performance/safe_json_v19_8_22.cjs",
    "scripts/repair_v19_8_26_main_perf_finish_2026.cjs",
    "scripts/diagnostico_v19_8_26_main_perf_finish_2026.cjs"
  ].forEach(nodeCheck);

  if (!exists("main.js")) {
    err("main.js nao encontrado");
  } else {
    const mainCode = read("main.js");
    nodeCheck("main.js");

    if (mainCode.includes("ollama_http_agent_v19_8_22.cjs")) ok("main.js importa OLLAMA_HTTP_AGENT");
    else err("main.js nao importa OLLAMA_HTTP_AGENT");

    if (mainCode.includes("safe_json_v19_8_22.cjs")) ok("main.js importa writeJsonAtomic");
    else err("main.js nao importa writeJsonAtomic");

    const writeJson = extractFunction(mainCode, "writeJson");
    if (writeJson.includes("writeJsonAtomic(file, value)")) ok("writeJson usa escrita atomica");
    else err("writeJson ainda nao usa escrita atomica");

    if (/function\s+writeJson[\s\S]{0,450}fs\.writeFileSync/.test(mainCode)) err("writeJson ainda usa fs.writeFileSync diretamente");
    else ok("writeJson sem fs.writeFileSync direto");

    const ollama = extractFunction(mainCode, "ollamaRequest");
    if (ollama.includes("agent: OLLAMA_HTTP_AGENT")) ok("ollamaRequest usa OLLAMA_HTTP_AGENT");
    else err("ollamaRequest nao usa OLLAMA_HTTP_AGENT");

    const loadState = extractFunction(mainCode, "loadState");
    if (loadState.includes("__NOELLE_V19_8_26_STATE_CACHE")) ok("loadState usa cache curto V19.8.26");
    else warn("loadState sem cache curto V19.8.26");

    const saveState = extractFunction(mainCode, "saveState");
    if (saveState.includes("__NOELLE_V19_8_26_STATE_CACHE")) ok("saveState atualiza cache V19.8.26");
    else warn("saveState sem atualizacao de cache V19.8.26");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.26-main-perf-finish-2026") ok("package.json version V19.8.26");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));

      if (pkg.scripts && pkg.scripts["auto:v19.8.26-main-perf-finish"]) ok("package.json contem auto V19.8.26");
      else warn("package.json sem auto V19.8.26");
    } catch (e) {
      err("package.json invalido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnostico V19.8.26 encontrou problemas.");
  else ok("Diagnostico V19.8.26 aprovado.");
}

main();
