#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function run(label, args) {
  console.log("================================================================");
  console.log(" " + label);
  console.log("================================================================");
  const res = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!exists("package.json") || !exists("src/renderer/modules/noelle_renderer_core_v19_8_27.js")) {
  console.log("[ERRO] Rode na raiz do projeto e aplique/copiei o V19.8.27 primeiro.");
  process.exit(1);
}

run("Aplicando V19.8.27a", ["scripts/repair_v19_8_27a_core_diagfix_2026.cjs"]);
run("Rodando diagnóstico V19.8.27a", ["scripts/diagnostico_v19_8_27a_core_diagfix_2026.cjs"]);

try {
  console.log("================================================================");
  console.log(" Git status");
  console.log("================================================================");
  spawnSync("git", ["status", "-sb"], { cwd: ROOT, stdio: "inherit", shell: true });
} catch (_) {}

console.log("[OK] V19.8.27a aplicado e diagnosticado.");
