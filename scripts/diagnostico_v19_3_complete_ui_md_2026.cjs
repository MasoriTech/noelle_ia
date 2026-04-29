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
console.log(" Diagnóstico V19.3 - Complete UI/MD Pack");
console.log("============================================================");

for (const rel of [
  "src/controls.html",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_3_complete_ui_md.js",
  "preload.js",
  "MEMORIA_GPT_NOELLE.md"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else warn(rel + " não encontrado.");
}

for (const rel of [
  "preload.js",
  "src/renderer/controls_window_app.js",
  "src/renderer/noelle_v19_3_complete_ui_md.js",
  "scripts/apply_v19_3_complete_ui_md_2026.cjs"
]) nodeCheck(rel);

const html = read("src/controls.html");
const runtimeCount = (html.match(/noelle_v19_3_complete_ui_md\.js/g) || []).length;
if (runtimeCount === 1) ok("controls.html carrega V19.3 uma vez.");
else warn("controls.html carrega V19.3 quantidade: " + runtimeCount + " (preload também pode injetar).");

for (const old of [
  "noelle_v19_2_settings_about_cleanup.js",
  "noelle_v19_2_1_settings_about_room_fix.js",
  "noelle_v19_2_2_select_dropdown_fix.js"
]) {
  if (!html.includes(old)) ok("controls.html sem script antigo: " + old);
  else warn("controls.html ainda referencia script antigo: " + old);
}

const preload = read("preload.js");
if (preload.includes("NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN")) ok("preload tem bootstrap V19.3.");
else warn("preload sem bootstrap V19.3.");

if (!preload.includes("var { contextBridge, ipcRenderer }")) ok("preload sem redeclaração var contextBridge/ipcRenderer.");
else err("preload ainda tem var { contextBridge, ipcRenderer }.");

const renderer = read("src/renderer/controls_window_app.js");
if (!renderer.includes("ensureNoelleRoomFloatingButton") && !renderer.includes("mountNoelleRoomV19Launcher")) ok("renderer sem launchers antigos conhecidos.");
else warn("renderer ainda pode conter launcher antigo.");

const runtime = read("src/renderer/noelle_v19_3_complete_ui_md.js");
if (runtime.includes("select option") && runtime.includes("color-scheme: dark")) ok("runtime contém correção de dropdown escuro.");
else err("runtime sem correção de dropdown.");
if (runtime.includes("SETTINGS") && runtime.includes("ABOUT_LINKS")) ok("runtime contém Configurações e Sobre.");
else err("runtime incompleto.");
if (runtime.includes("ROOM_BUTTON_ID") && runtime.includes("cleanupRoomButtons")) ok("runtime contém botão Room único.");
else err("runtime sem correção de botão Room.");

const mem = read("MEMORIA_GPT_NOELLE.md");
if (mem.includes("V19.3 Complete UI/MD Pack")) ok("MEMORIA_GPT_NOELLE.md atualizado com V19.3.");
else warn("MEMORIA_GPT_NOELLE.md sem V19.3.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] V19.3 OK.");
