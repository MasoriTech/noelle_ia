#!/usr/bin/env node
"use strict";

/*
  V19.8.26 automatico:
  1. valida ambiente
  2. aplica repair
  3. roda diagnostico
  4. mostra git status
  Nao faz commit/push automatico sem voce executar.
*/

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function run(label, cmd, args) {
  console.log("================================================================");
  console.log(" " + label);
  console.log("================================================================");

  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false
  });

  if (res.status !== 0) {
    console.log("[ERRO] " + label + " falhou com codigo " + res.status);
    process.exit(res.status || 1);
  }

  console.log("[OK] " + label);
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

console.log("================================================================");
console.log(" Noelle/Yoru V19.8.26 - Aplicacao automatica");
console.log("================================================================");

if (!exists("package.json")) {
  console.log("[ERRO] package.json nao encontrado. Rode na raiz do projeto.");
  process.exit(1);
}

if (!exists("main.js")) {
  console.log("[ERRO] main.js nao encontrado. Rode na raiz do projeto.");
  process.exit(1);
}

[
  "scripts/repair_v19_8_26_main_perf_finish_2026.cjs",
  "scripts/diagnostico_v19_8_26_main_perf_finish_2026.cjs",
  "src/main/performance/ollama_http_agent_v19_8_22.cjs",
  "src/main/performance/safe_json_v19_8_22.cjs"
].forEach((rel) => {
  if (!exists(rel)) {
    console.log("[ERRO] Arquivo necessario nao encontrado: " + rel);
    process.exit(1);
  }
});

run("Aplicando repair V19.8.26", process.execPath, ["scripts/repair_v19_8_26_main_perf_finish_2026.cjs"]);
run("Rodando diagnostico V19.8.26", process.execPath, ["scripts/diagnostico_v19_8_26_main_perf_finish_2026.cjs"]);

try {
  console.log("================================================================");
  console.log(" Git status");
  console.log("================================================================");
  spawnSync("git", ["status", "-sb"], { cwd: ROOT, stdio: "inherit", shell: true });
} catch (_) {}

console.log("================================================================");
console.log(" V19.8.26 aplicado e diagnosticado.");
console.log(" Proximo: abrir o app, testar, depois commit/push.");
console.log("================================================================");
