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
console.log(" Diagnóstico V19.2.1 - Settings/About/Room Fix");
console.log("============================================================");

for (const rel of [
  "src/controls.html",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_2_1_settings_about_room_fix.js",
  "preload.js"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else err(rel + " faltando.");
}

for (const rel of [
  "preload.js",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_2_1_settings_about_room_fix.js",
  "scripts/apply_v19_2_1_settings_about_room_fix_2026.cjs"
]) nodeCheck(rel);

const html = read("src/controls.html");
const runtimeCount = (html.match(/noelle_v19_2_1_settings_about_room_fix\.js/g) || []).length;
if (runtimeCount === 1) ok("controls.html carrega runtime V19.2.1 uma vez.");
else warn("controls.html runtime V19.2.1 quantidade: " + runtimeCount);

const preload = read("preload.js");
if (preload.includes("NOELLE_V19_2_1_PRELOAD_BOOTSTRAP_BEGIN")) ok("preload tem bootstrap V19.2.1.");
else err("preload sem bootstrap V19.2.1.");

if (!preload.includes("var { contextBridge, ipcRenderer }")) ok("preload sem redeclaração var contextBridge/ipcRenderer.");
else err("preload ainda tem var { contextBridge, ipcRenderer }.");

const renderer = read("src/renderer/controls_window_app.js");
if (!renderer.includes("ensureNoelleRoomFloatingButton") && !renderer.includes("mountNoelleRoomV19Launcher")) ok("launchers antigos removidos do renderer.");
else warn("renderer ainda pode conter launcher antigo.");

const runtime = read("src/renderer/noelle_v19_2_1_settings_about_room_fix.js");
if (runtime.includes("CONFIG_GROUPS") && runtime.includes("ABOUT_LINKS")) ok("runtime contém Configurações e Sobre.");
else err("runtime incompleto.");
if (runtime.includes("looksLikeFloatingRoomButton") && runtime.includes("ROOM_BUTTON_ID")) ok("runtime corrige botão Room duplicado.");
else err("runtime não corrige botão Room duplicado.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] V19.2.1 OK.");
