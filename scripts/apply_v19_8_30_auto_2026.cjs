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

if (!exists("package.json") || !exists("src/controls.html")) {
  console.log("[ERRO] Rode este script na raiz do projeto noelle_ia.");
  process.exit(1);
}

[
  "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
  "scripts/repair_v19_8_30_stream_mic_button_2026.cjs",
  "scripts/diagnostico_v19_8_30_stream_mic_button_2026.cjs"
].forEach((rel) => {
  if (!exists(rel)) {
    console.log("[ERRO] Arquivo necessário não encontrado: " + rel);
    process.exit(1);
  }
});

run("Aplicando V19.8.30", ["scripts/repair_v19_8_30_stream_mic_button_2026.cjs"]);
run("Rodando diagnóstico V19.8.30", ["scripts/diagnostico_v19_8_30_stream_mic_button_2026.cjs"]);

try {
  console.log("================================================================");
  console.log(" Git status");
  console.log("================================================================");
  spawnSync("git", ["status", "-sb"], { cwd: ROOT, stdio: "inherit", shell: true });
} catch (_) {}

console.log("[OK] V19.8.30 aplicado e diagnosticado.");
