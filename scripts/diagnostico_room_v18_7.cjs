"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }
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
console.log(" Diagnóstico V18.7 - Yoru POV Walk");
console.log("============================================================");

for (const rel of [
  "src/room.html",
  "src/renderer/room_player_avatar.js",
  "src/renderer/room_player_controller.js",
  "src/renderer/room_modes.js"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else err(rel + " faltando.");
}

for (const rel of [
  "src/renderer/room_player_avatar.js",
  "src/renderer/room_player_controller.js",
  "src/renderer/room_modes.js",
  "scripts/build_room_v18_7.cjs"
]) checkJs(rel);

const avatar = read("src/renderer/room_player_avatar.js");
if (avatar.includes("DEFAULT_AVATAR_URLS") && avatar.includes("Noelle.vrm") && avatar.includes("Yoru.vrm")) ok("avatar loader tenta Yoru.vrm e Noelle.vrm.");
else err("avatar loader sem fallbacks de VRM.");

if (avatar.includes("root.visible = mode === \"third_person\"")) ok("First person esconde corpo para evitar câmera dentro da cabeça.");
else warn("Não detectei proteção de clipping no first person.");

const controller = read("src/renderer/room_player_controller.js");
if (controller.includes("createRoomPlayerAvatar") && controller.includes("avatar.getEyeHeight")) ok("player controller usa altura dos olhos do avatar.");
else err("player controller não usa avatar/eyeHeight.");

const modes = read("src/renderer/room_modes.js");
if (modes.includes("Yoru POV")) ok("room_modes identifica Yoru POV.");
else warn("room_modes sem texto Yoru POV.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
