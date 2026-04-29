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
console.log(" Diagnóstico V19.6 - Avatar Lab Isolated");
console.log("============================================================");

for (const rel of [
  "src/avatar_lab_v19_6.html",
  "src/renderer/avatar_lab_v19_6_app.js",
  "src/renderer/avatar_lab_launcher_v19_6.js",
  "src/renderer/room_sync_bridge_v19_6.js",
  "scripts/build_avatar_lab_v19_6_2026.cjs",
  "MEMORIA_GPT_NOELLE.md"
]) {
  if (exists(rel)) ok(rel + " existe.");
  else warn(rel + " não encontrado.");
}

for (const rel of [
  "src/renderer/avatar_lab_v19_6_app.js",
  "src/renderer/avatar_lab_launcher_v19_6.js",
  "src/renderer/room_sync_bridge_v19_6.js",
  "scripts/build_avatar_lab_v19_6_2026.cjs",
  "scripts/apply_v19_6_avatar_lab_isolated_2026.cjs"
]) nodeCheck(rel);

const pkg = read("package.json");
for (const dep of ["three", "@pixiv/three-vrm", "@pixiv/three-vrm-animation", "esbuild"]) {
  if (pkg.includes(dep)) ok("package.json contém " + dep);
  else warn("package.json sem " + dep);
}

const app = read("src/renderer/avatar_lab_v19_6_app.js");
if (app.includes("VRMLoaderPlugin") && app.includes("userData?.vrm")) ok("Avatar Lab usa loader VRM real.");
else err("Avatar Lab sem loader VRM real.");
if (app.includes("VRMAnimationLoaderPlugin") && app.includes("createVRMAnimationClip")) ok("Avatar Lab usa VRMA/animações.");
else err("Avatar Lab sem VRMA/animações.");
if (app.includes("BroadcastChannel") && app.includes("noelle-avatar-room-sync")) ok("Avatar Lab envia sincronização com Room.");
else err("Avatar Lab sem sync com Room.");
if (app.includes("URL.createObjectURL")) ok("Avatar Lab suporta carregar VRM local para evitar Failed to fetch.");
else warn("Avatar Lab não parece suportar arquivo local.");

const controls = read("src/controls.html");
if (controls.includes("avatar_lab_launcher_v19_6.js")) ok("controls.html tem botão Avatar Lab.");
else warn("controls.html sem launcher Avatar Lab.");

const room = read("src/room.html");
if (room.includes("room_sync_bridge_v19_6.js")) ok("room.html tem bridge de sync.");
else warn("room.html sem bridge de sync.");

if (exists("src/renderer_dist/avatar_lab_v19_6.bundle.js")) ok("bundle avatar_lab_v19_6.bundle.js existe.");
else warn("bundle ainda não existe. Rode: npm install && npm run build:avatar-lab-v19.6");

const mem = read("MEMORIA_GPT_NOELLE.md");
if (mem.includes("V19.6 Avatar Lab Isolated")) ok("MEMORIA_GPT_NOELLE.md atualizado.");
else warn("MEMORIA_GPT_NOELLE.md sem V19.6.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] V19.6 OK.");
