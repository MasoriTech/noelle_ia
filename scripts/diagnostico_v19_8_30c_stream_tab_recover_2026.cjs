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
  log(" Diagnóstico V19.8.30c - Stream Tab Recover");
  log("================================================================");

  [
    "src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js",
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "scripts/repair_v19_8_30c_stream_tab_recover_2026.cjs",
    "scripts/diagnostico_v19_8_30c_stream_tab_recover_2026.cjs"
  ].forEach((rel) => {
    if (exists(rel)) nodeCheck(rel);
    else if (rel.includes("stream_page")) warn(rel + " não encontrado; recovery usa fallback");
    else err(rel + " não encontrado");
  });

  if (exists("src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js")) {
    const js = read("src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js");
    const runtime = stripCommentsAndStrings(js);

    if (js.includes("window.NoelleStreamTabRecoverV19830c")) ok("recovery expõe window.NoelleStreamTabRecoverV19830c");
    else err("recovery não expõe window.NoelleStreamTabRecoverV19830c");

    if (js.includes('[data-target="stream"]') && js.includes('data-page="stream"')) ok("recovery garante nav/page Stream");
    else err("recovery não parece garantir nav/page Stream");

    if (!/getUserMedia|MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\.chat|noelleAPI\.speak|piper/i.test(runtime)) {
      ok("recovery não liga microfone nem chama STT/Ollama/TTS");
    } else {
      err("recovery contém chamada indevida de microfone/STT/Ollama/TTS");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(runtime)) ok("recovery sem observer/remove DOM");
    else err("recovery contém observer ou remoção real de DOM");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");
    if (html.includes("noelle_stream_tab_recover_v19_8_30c.js")) ok("controls.html carrega recovery V19.8.30c");
    else err("controls.html não carrega recovery V19.8.30c");

    const appIndex = html.indexOf("controls_window_app.js");
    const recoverIndex = html.indexOf("noelle_stream_tab_recover_v19_8_30c.js");
    if (appIndex >= 0 && recoverIndex >= 0 && appIndex < recoverIndex) ok("recovery carrega após controls_window_app.js");
    else if (recoverIndex >= 0) warn("ordem do recovery não é ideal, mas ele tenta reexecutar");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.30c-stream-tab-recover-2026") ok("package.json version V19.8.30c");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.30c encontrou problemas.");
  else ok("Diagnóstico V19.8.30c aprovado.");
}

main();
