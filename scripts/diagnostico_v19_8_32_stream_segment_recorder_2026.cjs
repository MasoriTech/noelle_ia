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
  log(" Diagnóstico V19.8.32 - Stream Segment Recorder");
  log("================================================================");

  [
    "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js",
    "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "scripts/repair_v19_8_32_stream_segment_recorder_2026.cjs",
    "scripts/diagnostico_v19_8_32_stream_segment_recorder_2026.cjs"
  ].forEach((rel) => {
    if (exists(rel)) nodeCheck(rel);
    else if (rel.includes("stream_vad") || rel.includes("audio_capture")) warn(rel + " não encontrado; depende de fases anteriores");
    else err(rel + " não encontrado");
  });

  if (exists("src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js")) {
    const rec = read("src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js");
    const runtime = stripCommentsAndStrings(rec);

    if (rec.includes("window.NoelleStreamSegmentRecorderV19832")) ok("recorder expõe window.NoelleStreamSegmentRecorderV19832");
    else err("recorder não expõe window.NoelleStreamSegmentRecorderV19832");

    if (runtime.includes("MediaRecorder")) ok("recorder usa MediaRecorder");
    else err("recorder não usa MediaRecorder");

    if (rec.includes("noelle-stream-vad-start-v19831") && rec.includes("noelle-stream-vad-finish-v19831")) ok("recorder escuta eventos VAD start/finish");
    else err("recorder não escuta eventos VAD start/finish");

    if (rec.includes("noelle-stream-segment-ready-v19832")) ok("recorder emite evento segment-ready");
    else err("recorder não emite segment-ready");

    if (!/whisper|faster-whisper|ollama|noelleAPI\.chat|noelleAPI\.speak|piper/i.test(runtime)) {
      ok("recorder sem STT/Ollama/TTS em código executável");
    } else {
      err("recorder contém STT/Ollama/TTS indevido em código executável");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(runtime)) ok("recorder sem observer/remove DOM");
    else err("recorder contém observer ou remoção real de DOM");
  }

  if (exists("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js")) {
    const mic = read("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js");

    if (mic.includes("noelle-stream-mic-start-v19832") && mic.includes("noelle-stream-mic-stop-v19832")) ok("módulo mic emite eventos start/stop V19.8.32");
    else err("módulo mic não emite eventos start/stop V19.8.32");

    if (mic.includes("getInternalStream")) ok("módulo mic expõe getInternalStream");
    else err("módulo mic não expõe getInternalStream");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");

    if (html.includes("noelle_stream_segment_recorder_v19_8_32.js")) ok("controls.html carrega recorder V19.8.32");
    else err("controls.html não carrega recorder V19.8.32");

    const vadIndex = html.indexOf("noelle_stream_vad_v19_8_31.js");
    const recIndex = html.indexOf("noelle_stream_segment_recorder_v19_8_32.js");

    if (vadIndex >= 0 && recIndex >= 0 && vadIndex < recIndex) ok("recorder carrega após VAD");
    else if (recIndex >= 0) warn("ordem do recorder não é ideal");
  }

  if (exists("src/styles/noelle_stream_v19_8_29.css")) {
    const css = read("src/styles/noelle_stream_v19_8_29.css");
    if (css.includes("stream-v19832-segment-grid")) ok("CSS do painel recorder presente");
    else warn("CSS do painel recorder não encontrado");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.32-stream-segment-recorder-2026") ok("package.json version V19.8.32");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.32 encontrou problemas.");
  else ok("Diagnóstico V19.8.32 aprovado.");
}

main();
