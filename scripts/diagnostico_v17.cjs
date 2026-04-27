"use strict";

/*
 Diagnóstico V17: não altera arquivos.
*/

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch (_) { return ""; }
}

function readJson(rel, fallback = null) {
  try {
    const text = read(rel).trim();
    return text ? JSON.parse(text) : fallback;
  } catch (_) {
    return fallback;
  }
}

function count(dirRel, regex) {
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => regex.test(name)).length;
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function bad(msg) { console.log(`[ERRO] ${msg}`); process.exitCode = 1; }

function syntaxCheck(rel) {
  if (!exists(rel)) return warn(`syntax: ausente ${rel}`);
  const result = cp.spawnSync("node", ["--check", rel], { cwd: ROOT, shell: process.platform === "win32", encoding: "utf8", stdio: "pipe" });
  if (result.status === 0) ok(`syntax: ${rel}`);
  else bad(`syntax falhou: ${rel}\n${result.stderr || result.stdout}`);
}

function checkPackage() {
  section("package.json");
  const pkg = readJson("package.json", {});
  if (!pkg || !pkg.scripts) return bad("package.json inválido ou ausente.");

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const latest = Object.entries(deps).filter(([, v]) => v === "latest");
  const loose = Object.entries(deps).filter(([, v]) => typeof v === "string" && /^[\^~]/.test(v));

  if (latest.length) warn(`Dependências com latest: ${latest.map(([k]) => k).join(", ")}`);
  else ok("Sem dependências com latest.");

  if (loose.length) warn(`Dependências com ^/~: ${loose.map(([k]) => k).join(", ")}`);
  else ok("Pacotes principais sem ^/~.");

  ["start", "diagnostico", "doctor", "check"].forEach((script) => {
    if (pkg.scripts[script]) ok(`script ${script}`);
    else warn(`script ausente: ${script}`);
  });
}

function checkGitignore() {
  section(".gitignore");
  const gitignore = read(".gitignore");
  if (!gitignore.trim()) return warn(".gitignore vazio/ausente.");
  if (/node_modules\/\s+release\/\s+dist\//.test(gitignore)) warn(".gitignore parece estar em uma linha só.");
  else ok(".gitignore em formato de linhas.");
  ["node_modules/", "logs/", "backups/", ".venv/", "!src/assets/"].forEach((rule) => {
    if (gitignore.includes(rule)) ok(`regra: ${rule}`);
    else warn(`regra ausente: ${rule}`);
  });
}

function checkAssets() {
  section("Assets reais");
  exists("src/assets/Noelle.vrm") ? ok("src/assets/Noelle.vrm") : bad("Falta src/assets/Noelle.vrm");

  const motions = count("src/assets/motions", /\.vrma$/i);
  const expressions = count("src/assets/expressions", /\.png$/i);
  const items = count("src/assets/items", /\.(glb|gltf)$/i);
  const avatars = count("src/assets/avatars", /\.vrm$/i);

  motions ? ok(`Motions .vrma: ${motions}`) : warn("Nenhum .vrma em src/assets/motions.");
  expressions ? ok(`Expressions PNG: ${expressions}`) : warn("Nenhum PNG em src/assets/expressions.");
  items ? ok(`Items GLB/GLTF: ${items}`) : warn("Nenhum item .glb/.gltf em src/assets/items.");
  ok(`Avatares extras: ${avatars}`);

  ["src/assets/motion_manifest.json", "src/assets/item_manifest.json", "src/assets/expressions/manifest.json"].forEach((file) => {
    exists(file) ? ok(file) : bad(`Manifest ausente: ${file}`);
  });
}

function checkConnections() {
  section("Conexões main/preload/renderer");
  const main = read("main.js");
  const preload = read("preload.js");
  const controls = read("src/renderer/controls_window_app.js");
  const avatar = read("src/renderer/avatar_window_app.js");

  main.includes("avatar:open") ? ok("main: avatar:open") : warn("main sem avatar:open");
  main.includes("noelle:assets") ? ok("main: noelle:assets") : warn("main sem noelle:assets");
  main.includes("tts:speak") ? ok("main: tts:speak") : warn("main sem tts:speak");

  preload.includes("contextBridge.exposeInMainWorld(\"noelleAPI\"") ? ok("preload: noelleAPI") : bad("preload sem noelleAPI");
  preload.includes("desktopWidget") ? ok("preload: desktopWidget compat") : warn("preload sem desktopWidget compat");

  controls.includes("renderMotionCards") ? ok("controls: renderMotionCards") : warn("controls sem renderMotionCards");
  controls.includes("renderExpressionCards") ? ok("controls: renderExpressionCards") : warn("controls sem renderExpressionCards");
  controls.includes("renderItemCards") ? ok("controls: renderItemCards") : warn("controls sem renderItemCards");

  avatar.includes("@pixiv/three-vrm") ? ok("avatar: @pixiv/three-vrm") : warn("avatar sem @pixiv/three-vrm");
  avatar.includes("playMotion") ? ok("avatar: playMotion") : warn("avatar sem playMotion");
  avatar.includes("equipItem") ? ok("avatar: equipItem") : warn("avatar sem equipItem");
}

function checkBats() {
  section("BATs na raiz");
  const bats = fs.readdirSync(ROOT).filter((name) => /\.bat$/i.test(name));
  if (bats.length === 1 && bats[0].toLowerCase() === "iniciar.bat") ok("Apenas INICIAR.bat na raiz.");
  else warn(`BATs na raiz: ${bats.join(", ") || "nenhum"}`);
}

function checkHotfixLeftovers() {
  section("Sobras de hotfix");
  const renderer = path.join(ROOT, "src", "renderer");
  const styles = path.join(ROOT, "src", "styles");
  const r = fs.existsSync(renderer) ? fs.readdirSync(renderer).filter((n) => /^noelle_chat_.*\.js$/i.test(n)) : [];
  const s = fs.existsSync(styles) ? fs.readdirSync(styles).filter((n) => /^noelle_chat_.*\.css$/i.test(n)) : [];
  if (r.length || s.length) warn(`Sobras encontradas: ${[...r, ...s].join(", ")}`);
  else ok("Sem sobras noelle_chat_* em renderer/styles.");
}

function main() {
  console.log("Noelle IA - Diagnóstico V17");
  checkPackage();
  checkGitignore();
  checkAssets();
  checkConnections();
  checkBats();
  checkHotfixLeftovers();

  section("Syntax check");
  [
    "main.js",
    "preload.js",
    "scripts/noelle_maintenance_v17.cjs",
    "scripts/diagnostico_v17.cjs",
    "scripts/rebuild_manifests_noelle.cjs",
    "src/renderer/controls_window_app.js",
    "src/renderer/avatar_window_app.js"
  ].forEach(syntaxCheck);

  if (process.exitCode) {
    console.log("\n[RESULTADO] Diagnóstico terminou com avisos/erros.");
  } else {
    console.log("\n[RESULTADO] Diagnóstico OK.");
  }
}

main();
