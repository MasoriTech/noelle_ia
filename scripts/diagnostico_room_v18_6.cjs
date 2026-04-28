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
console.log(" Diagnóstico V18.6 - Room Walk Robust");
console.log("============================================================");

for (const rel of [
  "src/room.html",
  "src/styles/room.css",
  "src/renderer/room_window_app.js",
  "src/renderer/room_scene.js",
  "src/renderer/room_walk_collision.js",
  "src/renderer/room_player_controller.js",
  "src/renderer/room_modes.js",
  "src/renderer/room_layout_store.js"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else err(rel + " faltando.");
}

for (const rel of [
  "main.js",
  "preload.js",
  "src/renderer/room_window_app.js",
  "src/renderer/room_scene.js",
  "src/renderer/room_walk_collision.js",
  "src/renderer/room_player_controller.js",
  "src/renderer/room_modes.js",
  "src/renderer/room_layout_store.js",
  "src/renderer/room_controls.js",
  "scripts/build_room_v18_6.cjs"
]) checkJs(rel);

const player = read("src/renderer/room_player_controller.js");
if (player.includes("requestPointerLock") && player.includes("cancelAnimationFrame") && player.includes("findSafeSpawn")) ok("player controller usa pointer lock nativo, cancela loop e spawn seguro.");
else err("player controller não parece V18.6 robust.");
if (!player.includes("new THREE.CapsuleGeometry ?")) ok("CapsuleGeometry sem bug de construtor ternário.");
else err("CapsuleGeometry ainda tem padrão frágil.");

const walkCollision = read("src/renderer/room_walk_collision.js");
if (walkCollision.includes("resolveThirdPersonCamera") && walkCollision.includes("findSafeSpawn")) ok("walk collision tem câmera third person segura e spawn fallback.");
else err("walk collision incompleto.");

const scene = read("src/renderer/room_scene.js");
if (scene.includes("setBuildControlsEnabled")) ok("room_scene desliga build controls nos modos de caminhada.");
else err("room_scene sem setBuildControlsEnabled.");

const store = read("src/renderer/room_layout_store.js");
if (store.includes("player:") && store.includes("pitch")) ok("layout_store salva player position/yaw/pitch.");
else warn("layout_store sem player completo.");

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
