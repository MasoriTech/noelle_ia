"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }
function parseJson(rel, fallback) { try { return JSON.parse(read(rel)); } catch { return fallback; } }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function checkJs(rel) {
  if (!exists(rel)) return warn(rel + " não encontrado.");
  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (result.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    console.error(result.stderr || result.stdout);
  }
}

console.log("============================================================");
console.log(" Diagnóstico V18.4 - Room Safety / Undo / Autosave");
console.log("============================================================");

for (const rel of [
  "src/room.html",
  "src/styles/room.css",
  "src/renderer/room_window_app.js",
  "src/renderer/room_scene.js",
  "src/renderer/room_collision.js",
  "src/renderer/room_catalog.js",
  "src/renderer/room_items.js",
  "src/renderer/room_layout_store.js",
  "src/renderer/room_controls.js",
  "src/renderer/room_history.js",
  "src/renderer/room_autosave.js",
  "src/assets/room_manifest.json",
  "src/assets/room_layout.json"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else err(rel + " faltando.");
}

for (const rel of [
  "main.js",
  "preload.js",
  "src/renderer/room_window_app.js",
  "src/renderer/room_scene.js",
  "src/renderer/room_collision.js",
  "src/renderer/room_catalog.js",
  "src/renderer/room_items.js",
  "src/renderer/room_layout_store.js",
  "src/renderer/room_controls.js",
  "src/renderer/room_history.js",
  "src/renderer/room_autosave.js",
  "scripts/build_room_v18_4.cjs"
]) checkJs(rel);

const html = read("src/room.html");
if (html.includes("btnUndo") && html.includes("btnRecover") && html.includes("safetyBox")) ok("room.html tem Undo/Redo/Recover/Safety.");
else err("room.html sem segurança V18.4.");

const items = read("src/renderer/room_items.js");
if (items.includes("createMissingAssetPlaceholder") && items.includes("onObjectCommitted") && items.includes("loadSourceOrPlaceholder")) ok("room_items tem placeholder e callbacks.");
else err("room_items não parece V18.4.");

const history = read("src/renderer/room_history.js");
if (history.includes("createRoomHistory") && history.includes("undo") && history.includes("redo")) ok("room_history OK.");
else err("room_history incompleto.");

const autosave = read("src/renderer/room_autosave.js");
if (autosave.includes("createAutosaveScheduler") && autosave.includes("loadRoomAutosave")) ok("room_autosave OK.");
else err("room_autosave incompleto.");

const main = read("main.js");
if (main.includes("createRoomWindow") && main.includes("room:open")) ok("main.js tem Room IPC.");
else err("main.js sem createRoomWindow/room:open.");

const preload = read("preload.js");
if (preload.includes("noelleRoom") && preload.includes("room:open")) ok("preload expõe noelleRoom.");
else err("preload sem noelleRoom.");

const manifest = parseJson("src/assets/room_manifest.json", {});
const list = Array.isArray(manifest) ? manifest : manifest.items || [];
if (list.length) ok(`room_manifest lista ${list.length} itens.`);
else warn("room_manifest vazio.");

if (exists("src/renderer_dist/room.bundle.js")) ok("room.bundle.js existe.");
else warn("room.bundle.js ainda não existe; rode build-room.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
