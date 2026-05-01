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
  log(" Diagnóstico V19.8.31 - Stream VAD Simple");
  log("================================================================");

  [
    "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "scripts/repair_v19_8_31_stream_vad_simple_2026.cjs",
    "scripts/diagnostico_v19_8_31_stream_vad_simple_2026.cjs"
  ].forEach((rel) => {
    if (exists(rel)) nodeCheck(rel);
    else if (rel.includes("stream_audio_capture")) warn(rel + " não encontrado; VAD depende da Fase 2");
    else err(rel + " não encontrado");
  });

  if (exists("src/renderer/modules/noelle_stream_vad_v19_8_31.js")) {
    const vad = read("src/renderer/modules/noelle_stream_vad_v19_8_31.js");
    const runtime = stripCommentsAndStrings(vad);

    if (vad.includes("window.NoelleStreamVadV19831")) ok("VAD expõe window.NoelleStreamVadV19831");
    else err("VAD não expõe window.NoelleStreamVadV19831");

    if (vad.includes("noelle-stream-audio-level-v19830")) ok("VAD escuta eventos de nível do microfone V19.8.30");
    else err("VAD não escuta evento de nível V19.8.30");

    if (vad.includes("noelle-stream-vad-start-v19831") && vad.includes("noelle-stream-vad-finish-v19831")) ok("VAD emite eventos start/finish");
    else err("VAD não emite eventos start/finish");

    if (vad.includes("speechThreshold") && vad.includes("silenceToFinishMs")) ok("VAD contém thresholds de fala/silêncio");
    else err("VAD sem thresholds principais");

    if (!/getUserMedia|MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\.chat|noelleAPI\.speak|piper/i.test(runtime)) {
      ok("VAD sem microfone direto/STT/Ollama/TTS em código executável");
    } else {
      err("VAD contém código indevido de microfone direto/STT/Ollama/TTS");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(runtime)) ok("VAD sem observer/remove DOM");
    else err("VAD contém observer ou remoção real de DOM");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");

    if (html.includes("noelle_stream_vad_v19_8_31.js")) ok("controls.html carrega VAD V19.8.31");
    else err("controls.html não carrega VAD V19.8.31");

    const micIndex = html.indexOf("noelle_stream_audio_capture_v19_8_30.js");
    const vadIndex = html.indexOf("noelle_stream_vad_v19_8_31.js");

    if (micIndex >= 0 && vadIndex >= 0 && micIndex < vadIndex) ok("VAD carrega após módulo de microfone");
    else if (vadIndex >= 0) warn("ordem do VAD não é ideal; ele pode não receber eventos se o mic não estiver carregado");
  }

  if (exists("src/styles/noelle_stream_v19_8_29.css")) {
    const css = read("src/styles/noelle_stream_v19_8_29.css");
    if (css.includes("stream-v19831-vad-grid")) ok("CSS do painel VAD presente");
    else warn("CSS do painel VAD não encontrado");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.31-stream-vad-simple-2026") ok("package.json version V19.8.31");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.31 encontrou problemas.");
  else ok("Diagnóstico V19.8.31 aprovado.");
}

main();
