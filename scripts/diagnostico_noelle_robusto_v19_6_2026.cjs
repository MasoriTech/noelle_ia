"use strict";

/* Diagnóstico robusto Noelle IA V19.6.1 — 2026 */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function abs(...parts) { return path.join(ROOT, ...parts); }
function exists(rel) { return fs.existsSync(abs(...rel.split("/"))); }
function read(rel) { return exists(rel) ? fs.readFileSync(abs(...rel.split("/")), "utf8") : ""; }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); failed = true; }

function nodeCheck(rel) {
  if (!exists(rel)) return err(`${rel} não encontrado.`);
  const result = cp.spawnSync(process.execPath, ["--check", abs(...rel.split("/"))], { encoding: "utf8" });
  if (result.status === 0) ok(`node --check ${rel}`);
  else {
    err(`node --check falhou: ${rel}`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }
}

function jsonCheck(rel) {
  if (!exists(rel)) return err(`${rel} não encontrado.`);
  try { JSON.parse(read(rel)); ok(`${rel} JSON válido`); }
  catch (e) { err(`${rel} JSON inválido: ${e.message}`); }
}

function checkContains(rel, needle, label, critical = true) {
  const txt = read(rel);
  if (txt.includes(needle)) ok(label);
  else critical ? err(label + " ausente") : warn(label + " ausente");
}

function runOptionalBuild() {
  if (!exists("node_modules/esbuild")) {
    warn("node_modules/esbuild não encontrado; build real pulado. Rode npm install antes do build.");
    return;
  }
  const r = cp.spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:avatar-lab-v19.6"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: false
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status === 0) ok("build:avatar-lab-v19.6 passou");
  else err("build:avatar-lab-v19.6 falhou");
}

console.log("============================================================");
console.log(" Diagnóstico Robusto Noelle IA V19.6.1 — 2026");
console.log("============================================================");

for (const rel of [
  "MEMORIA_GPT_NOELLE.md",
  "package.json",
  "main.js",
  "preload.js",
  "src/controls.html",
  "src/avatar_view.html",
  "src/avatar_lab_v19_6.html",
  "src/renderer/avatar_lab_v19_6_app.js",
  "src/renderer/avatar_lab_launcher_v19_6.js",
  "src/renderer/room_sync_bridge_v19_6.js",
  "scripts/build_avatar_lab_v19_6_2026.cjs",
  "scripts/noelle_v19_6_robust_fix_2026.cjs"
]) {
  exists(rel) ? ok(`${rel} existe`) : warn(`${rel} não encontrado`);
}

for (const rel of [
  "main.js",
  "preload.js",
  "src/renderer/avatar_lab_v19_6_app.js",
  "src/renderer/avatar_lab_launcher_v19_6.js",
  "src/renderer/room_sync_bridge_v19_6.js",
  "scripts/build_avatar_lab_v19_6_2026.cjs",
  "scripts/noelle_v19_6_robust_fix_2026.cjs",
  "scripts/diagnostico_noelle_robusto_v19_6_2026.cjs"
]) nodeCheck(rel);

jsonCheck("package.json");
if (exists("src/assets/motion_manifest.json")) jsonCheck("src/assets/motion_manifest.json"); else warn("src/assets/motion_manifest.json não encontrado");
if (exists("src/assets/item_manifest.json")) jsonCheck("src/assets/item_manifest.json"); else warn("src/assets/item_manifest.json não encontrado");
if (exists("src/assets/expressions/manifest.json")) jsonCheck("src/assets/expressions/manifest.json"); else warn("src/assets/expressions/manifest.json não encontrado");

const pkg = read("package.json");
for (const dep of ["three", "@pixiv/three-vrm", "@pixiv/three-vrm-animation", "esbuild"]) {
  pkg.includes(dep) ? ok(`package.json contém ${dep}`) : warn(`package.json sem ${dep}`);
}

const app = read("src/renderer/avatar_lab_v19_6_app.js");
if (app.includes("await loadMotionManifest();") && !app.includes("bootAvatarLabV196")) {
  err("Avatar Lab ainda tem top-level await incompatível com esbuild format:iife");
} else ok("Avatar Lab sem top-level await antigo");
checkContains("src/renderer/avatar_lab_v19_6_app.js", "bootAvatarLabV196", "Avatar Lab usa boot async compatível com IIFE", true);
checkContains("src/renderer/avatar_lab_v19_6_app.js", "VRMLoaderPlugin", "Avatar Lab usa loader VRM real", true);
checkContains("src/renderer/avatar_lab_v19_6_app.js", "VRMAnimationLoaderPlugin", "Avatar Lab usa loader VRMA", true);
checkContains("src/renderer/avatar_lab_v19_6_app.js", "BroadcastChannel", "Avatar Lab usa BroadcastChannel para sync", true);
checkContains("src/renderer/avatar_lab_v19_6_app.js", "URL.createObjectURL", "Avatar Lab aceita arquivo local", true);

checkContains("preload.js", "contextBridge.exposeInMainWorld(\"noelleAPI\"", "preload mantém window.noelleAPI", true);
checkContains("preload.js", "desktopWidget", "preload mantém compatibilidade desktopWidget", true);
checkContains("main.js", "Tray", "main.js mantém bandeja do sistema", false);
checkContains("main.js", "avatar_view.html", "main.js referencia avatar_view.html", false);

for (const rel of [
  "src/assets/Noelle.vrm",
  "src/assets/motions",
  "src/assets/expressions",
  "src/assets/items",
  "assets/icons/app.ico"
]) {
  exists(rel) ? ok(`${rel} preservado`) : warn(`${rel} não encontrado nesta cópia`);
}

const rootFiles = fs.readdirSync(ROOT);
const bats = rootFiles.filter((n) => /\.bat$/i.test(n));
if (bats.length <= 2) ok(`Quantidade de .bat na raiz aceitável: ${bats.join(", ") || "nenhum"}`);
else warn(`Muitos .bat na raiz: ${bats.join(", ")}`);

runOptionalBuild();

console.log("============================================================");
if (failed) {
  console.log("[RESULTADO] Existem problemas para corrigir.");
  process.exit(1);
}
console.log("[RESULTADO] Diagnóstico robusto OK ou apenas com avisos.");
