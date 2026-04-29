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
console.log(" Diagnóstico V19.5 - Avatar Real VRM Sync Anim");
console.log("============================================================");

for (const rel of [
  "src/renderer/avatar_v19_5_panel_bootstrap.js",
  "src/renderer/avatar_v19_5_preview_app.js",
  "src/renderer/avatar_room_sync_bridge_v19_5.js",
  "scripts/build_avatar_v19_5_2026.cjs",
  "preload.js",
  "MEMORIA_GPT_NOELLE.md"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else warn(rel + " não encontrado.");
}

for (const rel of [
  "preload.js",
  "src/renderer/avatar_v19_5_panel_bootstrap.js",
  "src/renderer/avatar_v19_5_preview_app.js",
  "src/renderer/avatar_room_sync_bridge_v19_5.js",
  "scripts/build_avatar_v19_5_2026.cjs",
  "scripts/apply_v19_5_avatar_real_vrm_sync_anim_2026.cjs"
]) nodeCheck(rel);

const pkg = read("package.json");
for (const dep of ["three", "@pixiv/three-vrm", "@pixiv/three-vrm-animation", "esbuild"]) {
  if (pkg.includes(dep)) ok("package.json contém " + dep);
  else warn("package.json sem " + dep);
}

const preview = read("src/renderer/avatar_v19_5_preview_app.js");
if (preview.includes("VRMLoaderPlugin") && preview.includes("gltf?.userData?.vrm")) ok("preview usa VRMLoaderPlugin e userData.vrm.");
else err("preview não parece carregar VRM corretamente.");
if (preview.includes("VRMAnimationLoaderPlugin") && preview.includes("createVRMAnimationClip")) ok("preview usa VRMAnimationLoaderPlugin/createVRMAnimationClip.");
else err("preview não parece carregar VRMA corretamente.");
if (preview.includes("BroadcastChannel") && preview.includes("noelle-avatar-room-sync")) ok("preview envia sync via BroadcastChannel.");
else err("preview sem sync BroadcastChannel.");

const room = read("src/renderer/avatar_room_sync_bridge_v19_5.js");
if (room.includes("noelle:room-avatar-sync") && room.includes("roomPlayerApi")) ok("bridge da Room escuta sync e tenta conectar APIs conhecidas.");
else warn("bridge da Room pode estar incompleta.");

if (exists("src/renderer_dist/avatar_v19_5.bundle.js")) ok("bundle avatar_v19_5.bundle.js existe.");
else warn("bundle ainda não existe. Rode: npm install && npm run build:avatar-v19.5");

const mem = read("MEMORIA_GPT_NOELLE.md");
if (mem.includes("V19.5 Avatar Real VRM Sync Anim")) ok("MEMORIA_GPT_NOELLE.md atualizado.");
else warn("MEMORIA_GPT_NOELLE.md sem V19.5.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] V19.5 OK.");
