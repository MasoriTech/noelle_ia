"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(abs(rel), "utf8") : ""; }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado.");
  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
  if (result.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }
}

console.log("============================================================");
console.log(" Diagnóstico V19.2 - Settings/About/Room Button Cleanup");
console.log("============================================================");

for (const rel of [
  "src/controls.html",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_2_settings_about_cleanup.js",
  "preload.js",
  "MEMORIA_GPT_NOELLE.md"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else err(rel + " faltando.");
}

for (const rel of [
  "preload.js",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_2_settings_about_cleanup.js",
  "scripts/apply_v19_2_settings_about_cleanup_2026.cjs"
]) nodeCheck(rel);

const html = read("src/controls.html");
const scriptCount = (html.match(/noelle_v19_2_settings_about_cleanup\.js/g) || []).length;
if (scriptCount === 1) ok("controls.html carrega o patch V19.2 uma vez.");
else err("controls.html carrega o patch V19.2 quantidade: " + scriptCount);

if (!html.includes("noelle-room-v19-launcher-inline")) ok("launcher inline antigo removido.");
else err("launcher inline antigo ainda existe em controls.html.");

const renderer = read("src/renderer/controls_window_app.js");
if (!renderer.includes("mountNoelleRoomV19Launcher")) ok("launcher JS antigo removido do renderer.");
else err("mountNoelleRoomV19Launcher ainda existe.");

const preload = read("preload.js");
if (preload.includes("NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN")) ok("preload tem bloco seguro noelleRoomV19.");
else warn("preload sem bloco seguro noelleRoomV19.");
if (!preload.includes("var { contextBridge, ipcRenderer }")) ok("preload sem redeclaração var contextBridge/ipcRenderer.");
else err("preload ainda tem var { contextBridge, ipcRenderer }.");

const runtime = read("src/renderer/noelle_v19_2_settings_about_cleanup.js");
if (runtime.includes("SETTINGS_GROUPS") && runtime.includes("ABOUT_LINKS")) ok("runtime tem configurações e Sobre.");
else err("runtime V19.2 incompleto.");
if (runtime.includes("showRoomButton") && runtime.includes("roomButtonPosition")) ok("runtime controla botão Room V19 único.");
else err("runtime não controla botão Room V19.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] V19.2 OK.");
