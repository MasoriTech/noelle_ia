#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = process.cwd();
let failed = false;

function run(label, args) {
  const res = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status === 0) console.log("[OK] " + label);
  else {
    console.log("[ERRO] " + label + " falhou");
    failed = true;
  }
}

console.log("================================================================");
console.log(" Diagnóstico V19.8.24 - Clean maintenance");
console.log("================================================================");

run("diagnostico:main", [path.join("scripts", "diagnostico_v19_8_24_main_2026.cjs")]);
run("diagnostico:preload", [path.join("scripts", "diagnostico_v19_8_24_preload_2026.cjs")]);
run("diagnostico:avatar", [path.join("scripts", "diagnostico_v19_8_24_avatar_2026.cjs")]);

if (failed) {
  console.log("[ERRO] Diagnóstico V19.8.24 encontrou problemas.");
  process.exit(1);
}

console.log("[OK] Diagnóstico V19.8.24 aprovado.");
