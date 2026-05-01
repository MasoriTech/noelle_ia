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

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.30 - Stream Mic Button");
  log("================================================================");

  [
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "scripts/repair_v19_8_30_stream_mic_button_2026.cjs",
    "scripts/diagnostico_v19_8_30_stream_mic_button_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js")) {
    const js = read("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js");

    if (js.includes("window.NoelleStreamAudioCaptureV19830")) ok("módulo expõe window.NoelleStreamAudioCaptureV19830");
    else err("módulo não expõe window.NoelleStreamAudioCaptureV19830");

    if (js.includes("navigator.mediaDevices.getUserMedia")) ok("módulo usa getUserMedia");
    else err("módulo não usa getUserMedia");

    if (js.includes('target.id === "streamStartBtn"') && js.includes('target.id === "streamStopBtn"')) ok("microfone controlado por botões Stream");
    else err("botões Start/Stop não detectados no módulo");

    if (js.includes("track.stop()")) ok("módulo desliga tracks do microfone");
    else err("módulo não parece desligar tracks");

    if (js.includes("visibilitychange") && js.includes("beforeunload")) ok("módulo desliga em ocultar/fechar");
    else warn("módulo sem proteção completa em ocultar/fechar");

    const jsRuntimeOnly = js
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, "");
    if (!/MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\\.chat|noelleAPI\\.speak|piper/i.test(jsRuntimeOnly)) {
      ok("Fase 2 sem STT/Ollama/TTS em código executável");
    } else {
      err("Fase 2 contém STT/Ollama/TTS indevido em código executável");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(js)) ok("módulo sem observer/remove DOM");
    else err("módulo contém observer ou remoção real de DOM");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");

    if (html.includes("noelle_stream_audio_capture_v19_8_30.js")) ok("controls.html carrega módulo mic V19.8.30");
    else err("controls.html não carrega módulo mic V19.8.30");

    if (html.includes("noelle_stream_page_v19_8_29.js")) ok("controls.html ainda carrega Stream page V19.8.29");
    else warn("controls.html sem Stream page V19.8.29");

    const pageIndex = html.indexOf("noelle_stream_page_v19_8_29.js");
    const micIndex = html.indexOf("noelle_stream_audio_capture_v19_8_30.js");
    if (pageIndex >= 0 && micIndex >= 0 && pageIndex < micIndex) ok("módulo mic carrega após Stream page");
    else if (micIndex >= 0) warn("ordem do módulo mic não é a esperada, mas pode funcionar");
  } else {
    err("src/controls.html não encontrado");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.30-stream-mic-button-2026") ok("package.json version V19.8.30");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (exists("docs/STREAM_MIC_BUTTON_V19_8_30.md")) ok("doc Stream Mic Button existe");
  else warn("doc STREAM_MIC_BUTTON_V19_8_30.md não encontrado");

  if (process.exitCode) err("Diagnóstico V19.8.30 encontrou problemas.");
  else ok("Diagnóstico V19.8.30 aprovado.");
}

main();
