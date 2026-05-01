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
  log(" Diagnóstico V19.8.29 - Stream Tab Skeleton");
  log("================================================================");

  [
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "src/renderer/controls_window_app.js",
    "scripts/repair_v19_8_29_stream_tab_skeleton_2026.cjs",
    "scripts/diagnostico_v19_8_29_stream_tab_skeleton_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/pages/noelle_stream_page_v19_8_29.js")) {
    const js = read("src/renderer/pages/noelle_stream_page_v19_8_29.js");

    if (js.includes("window.NoelleStreamPageV19829")) ok("Stream page expõe window.NoelleStreamPageV19829");
    else err("Stream page não expõe window.NoelleStreamPageV19829");

    if (js.includes("shouldRespond") && js.includes("Noelle") && js.includes("Yoru")) ok("StreamGuard visual presente");
    else err("StreamGuard visual não detectada");

    if (!/getUserMedia|MediaRecorder|whisper|ollamaAPI|noelleAPI\.chat|noelleAPI\.speak/i.test(js)) {
      ok("Fase 1 sem microfone/STT/Ollama/TTS real");
    } else {
      err("Fase 1 contém chamada real de microfone/STT/Ollama/TTS");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(js)) ok("Stream page sem observer/remove DOM");
    else err("Stream page contém observer ou remoção real de DOM");
  }

  if (exists("src/styles/noelle_stream_v19_8_29.css")) ok("CSS da Stream existe");
  else err("CSS da Stream não encontrado");

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");

    if (html.includes("noelle_stream_v19_8_29.css")) ok("controls.html carrega CSS Stream V19.8.29");
    else err("controls.html não carrega CSS Stream V19.8.29");

    if (html.includes("noelle_stream_page_v19_8_29.js")) ok("controls.html carrega JS Stream V19.8.29");
    else err("controls.html não carrega JS Stream V19.8.29");

    const streamIndex = html.indexOf("noelle_stream_page_v19_8_29.js");
    const appIndex = html.indexOf("controls_window_app.js");
    if (streamIndex >= 0 && appIndex >= 0 && streamIndex < appIndex) ok("Stream JS carrega antes de controls_window_app.js");
    else if (appIndex >= 0) warn("Stream JS não parece carregar antes de controls_window_app.js");
  } else {
    err("src/controls.html não encontrado");
  }

  if (exists("src/renderer/controls_window_app.js")) {
    const app = read("src/renderer/controls_window_app.js");
    if (app.includes("NOELLE_V19_8_29_STREAM_TAB_SKELETON")) ok("controls_window_app marcado com V19.8.29");
    else warn("controls_window_app sem marcador V19.8.29");

    if (/stream:\s*"Stream IA"/.test(app)) ok("controls_window_app contém título Stream IA");
    else warn("controls_window_app sem título Stream IA");

    if (app.includes('page === "stream"')) ok("controls_window_app contém hook de render Stream");
    else warn("controls_window_app sem hook de render Stream");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.29-stream-tab-skeleton-2026") ok("package.json version V19.8.29");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (exists("docs/STREAM_ARCHITECTURE_V19_8_29.md")) ok("doc de arquitetura Stream existe");
  else warn("doc STREAM_ARCHITECTURE_V19_8_29.md não encontrado");

  if (exists("docs/STREAMGUARD_SKILL_V19_8_29.md")) ok("doc StreamGuard Skill existe");
  else warn("doc STREAMGUARD_SKILL_V19_8_29.md não encontrado");

  if (process.exitCode) err("Diagnóstico V19.8.29 encontrou problemas.");
  else ok("Diagnóstico V19.8.29 aprovado.");
}

main();
