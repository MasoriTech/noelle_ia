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
  else { err("node --check falhou: " + rel); console.error(result.stderr || result.stdout); }
}
function countGlob(dir, re) {
  try { return fs.readdirSync(path.join(ROOT, dir)).filter((f) => re.test(f)).length; } catch { return 0; }
}

console.log("============================================================");
console.log(" Diagnóstico V19 MegaLayout 2026");
console.log("============================================================");

for (const rel of [
  "src/room.html",
  "src/styles/room_v19.css",
  "src/renderer/room_v19_app.js",
  "docs/NOELLE_V19_100_SUGESTOES.md",
  "src/avatar_view.html",
  "src/renderer/avatar_window_app.js",
  "src/renderer/motions.js",
  "src/renderer/items.js",
  "src/renderer/local_assets.js",
  "src/assets/Noelle.vrm",
  "src/assets/motion_manifest.json",
  "src/assets/item_manifest.json",
  "src/assets/expressions/manifest.json"
]) {
  exists(rel) ? ok(rel + " existe.") : err(rel + " faltando.");
}

checkJs("main.js");
checkJs("preload.js");
checkJs("src/renderer/controls_window_app.js");
checkJs("src/renderer/room_v19_app.js");
checkJs("scripts/build_room_v19_2026.cjs");

const html = read("src/room.html");
if (html.includes("room-topbar") && html.includes("room-leftbar") && html.includes("room-rightbar") && html.includes("room-downbar")) ok("Layout anti-sobreposição detectado.");
else err("Layout top/left/right/downbar não detectado.");

const app = read("src/renderer/room_v19_app.js");
if (app.includes("ROADMAP") && app.includes("Yoru POV") && app.includes("Parar foco")) ok("Room V19 inclui roadmap, Yoru POV e Parar foco.");
else err("Room V19 incompleta.");

const main = read("main.js");
if (main.includes("NOELLE_ROOM_V19_BEGIN") && main.includes("room:open")) ok("main.js tem Room V19 IPC.");
else err("main.js sem Room V19 IPC.");

const preload = read("preload.js");
if (preload.includes("noelleRoomV19")) ok("preload expõe noelleRoomV19.");
else err("preload sem noelleRoomV19.");

const bats = fs.readdirSync(ROOT).filter((f) => /\.bat$/i.test(f));
if (bats.length === 1 && bats[0].toLowerCase() === "iniciar.bat") ok("Apenas INICIAR.bat na raiz.");
else warn("BATs na raiz: " + bats.join(", "));

ok("VRM em avatars: " + countGlob("src/assets/avatars", /\.vrm$/i));
ok("Motions VRMA: " + countGlob("src/assets/motions", /\.vrma$/i));
ok("Expressions PNG: " + countGlob("src/assets/expressions", /\.png$/i));
ok("Items GLB: " + countGlob("src/assets/items", /\.(glb|gltf)$/i));

if (exists("src/renderer_dist/room.bundle.js")) ok("room.bundle.js existe.");
else warn("room.bundle.js ainda não existe; rode npm run build-room.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
