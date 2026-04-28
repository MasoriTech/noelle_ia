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
console.log(" Diagnóstico V18.8 - Yoru Player Robust");
console.log("============================================================");

for (const rel of [
  "src/assets/avatars/Yoru.vrm",
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
  "scripts/build_room_v18_8.cjs"
]) checkJs(rel);

const pkgText = read("package.json");
if (pkgText.includes("@pixiv/three-vrm")) ok("package.json contém @pixiv/three-vrm.");
else err("package.json sem @pixiv/three-vrm.");

const avatar = read("src/renderer/room_player_avatar.js");
if (avatar.includes("VRMLoaderPlugin") && avatar.includes("gltf.userData.vrm")) ok("avatar loader usa VRMLoaderPlugin e gltf.userData.vrm.");
else err("avatar loader não usa three-vrm corretamente.");

if (avatar.includes("VRMUtils.rotateVRM0") && avatar.includes("removeUnnecessaryVertices")) ok("avatar loader usa VRMUtils para compatibilidade/otimização.");
else warn("VRMUtils incompleto.");

if (avatar.includes("root.visible = mode === \"third_person\"")) ok("First person esconde corpo para evitar câmera dentro da cabeça.");
else warn("Não detectei proteção de clipping no first person.");

const controller = read("src/renderer/room_player_controller.js");
if (controller.includes("avatarReady") && controller.includes("avatar.getEyeHeight")) ok("controller expõe avatarReady e usa altura dos olhos.");
else err("controller não usa avatar/eyeHeight.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
