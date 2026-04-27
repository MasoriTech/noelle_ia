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
console.log(" Diagnóstico V18.2 - Room ultra robusta");
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
  "scripts/build_room_v18_2.cjs"
]) checkJs(rel);

const scene = read("src/renderer/room_scene.js");
if (scene.includes("TransformControls") && scene.includes("getHelper") && scene.includes("OrbitControls")) ok("Room usa OrbitControls + TransformControls com getHelper compatível.");
else err("Room scene não está robusta.");

const items = read("src/renderer/room_items.js");
if (items.includes("makeCloneResourcesUnique") && items.includes("setUserScale") && items.includes("getUserScale")) ok("room_items corrige clone/material e escala persistida.");
else err("room_items.js não parece ser V18.2.");
if (items.includes('file.startsWith("src/assets/") return "./"')) ok("Path src/assets corrigido para ./assets.");
else warn("Não detectei correção explícita de path src/assets.");

const collision = read("src/renderer/room_collision.js");
if (collision.includes("Box3") && collision.includes("intersectsBox") && collision.includes("ROOM_LIMITS")) ok("room_collision tem Box3, colisão e limites.");
else err("room_collision incompleto.");

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
