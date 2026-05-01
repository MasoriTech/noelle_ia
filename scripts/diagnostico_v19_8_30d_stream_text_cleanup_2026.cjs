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

function stripCommentsAndStrings(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/(["'\`])(?:\\.|(?!\1)[\s\S])*\1/g, "");
}

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.30d - Stream text cleanup");
  log("================================================================");

  [
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js",
    "scripts/repair_v19_8_30d_stream_text_cleanup_2026.cjs",
    "scripts/diagnostico_v19_8_30d_stream_text_cleanup_2026.cjs"
  ].forEach((rel) => {
    if (exists(rel)) nodeCheck(rel);
    else if (rel.includes("recover")) warn(rel + " não encontrado; recovery não instalado");
    else err(rel + " não encontrado");
  });

  if (exists("src/renderer/pages/noelle_stream_page_v19_8_29.js")) {
    const page = read("src/renderer/pages/noelle_stream_page_v19_8_29.js");

    if (page.includes("NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP")) ok("Stream page marcada com V19.8.30d");
    else err("Stream page sem marcador V19.8.30d");

    if (!page.includes("Fase 1: botão liga apenas o estado visual")) ok("texto antigo de Fase 1 removido");
    else err("texto antigo de Fase 1 ainda existe");

    if (!page.includes("Microfone real entra na V19.8.30")) ok("texto antigo do microfone removido");
    else err("texto antigo do microfone ainda existe");

    if (page.includes("Fase 2: microfone por botão ativo")) ok("texto novo de Fase 2 presente");
    else err("texto novo de Fase 2 não encontrado");

    if (page.includes("window.NoelleStreamPageV19829")) ok("Stream page ainda expõe NoelleStreamPageV19829");
    else err("Stream page não expõe NoelleStreamPageV19829");
  }

  if (exists("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js")) {
    const mic = read("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js");
    const runtime = stripCommentsAndStrings(mic);

    if (mic.includes("window.NoelleStreamAudioCaptureV19830")) ok("módulo mic preservado");
    else err("módulo mic não expõe NoelleStreamAudioCaptureV19830");

    if (mic.includes("navigator.mediaDevices.getUserMedia")) ok("microfone por botão preservado");
    else err("getUserMedia não detectado no módulo mic");

    if (!/MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\.chat|noelleAPI\.speak|piper/i.test(runtime)) {
      ok("sem transcrição/resposta/voz em código executável");
    } else {
      err("foi detectado código indevido de transcrição/resposta/voz");
    }
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.30d-stream-text-cleanup-2026") ok("package.json version V19.8.30d");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.30d encontrou problemas.");
  else ok("Diagnóstico V19.8.30d aprovado.");
}

main();
