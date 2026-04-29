"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
let problems = 0;
let warnings = 0;
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { warnings++; console.log(`[AVISO] ${msg}`); }
function err(msg) { problems++; console.error(`[ERRO] ${msg}`); }
function exists(file) { try { return fs.existsSync(path.join(root, file)); } catch { return false; } }
function read(file) { try { return fs.readFileSync(path.join(root, file), "utf8"); } catch { return ""; } }
function checkFile(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return err(`Arquivo ausente: ${file}`);
  const size = fs.statSync(abs).size;
  if (size <= 0) return err(`Arquivo vazio: ${file}`);
  ok(`arquivo presente: ${file}`);
}

console.log("================================================================");
console.log(" Noelle V19.8.2 - diagnostico Aba Avatar Real");
console.log("================================================================");

checkFile("preload.js");
checkFile("src/renderer/noelle_avatar_tab_v19_8_2.js");
checkFile("src/renderer/avatar_carousel_preview_v19_8_2_app.mjs");
checkFile("src/avatar_carousel_preview_v19_8_2.html");
checkFile("scripts/build_avatar_preview_v19_8_2_2026.cjs");
checkFile("scripts/repair_v19_8_2_avatar_real_2026.cjs");
checkFile("scripts/diagnostico_v19_8_2_avatar_real_2026.cjs");

const preload = read("preload.js");
[
  "noelle-v19-5-avatar-panel-script",
  "noelle-v19-3-complete-runtime-script",
  "avatar_v19_5_panel_bootstrap.js",
  "noelle_v19_3_complete_ui_md.js",
  "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN",
  "NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN",
  "document.createElement(\"script\")",
  "appendChild(script)"
].forEach((token) => preload.includes(token) ? err(`preload.js ainda contem legado: ${token}`) : ok(`preload.js sem legado: ${token}`));

const controlsHtml = read("src/controls.html");
if (controlsHtml.includes("noelle_avatar_tab_v19_8_2.js")) ok("src/controls.html carrega noelle_avatar_tab_v19_8_2.js");
else err("src/controls.html nao carrega noelle_avatar_tab_v19_8_2.js");
if (controlsHtml.includes("noelle_avatar_tab_v19_8_2.css")) ok("src/controls.html carrega noelle_avatar_tab_v19_8_2.css");
else err("src/controls.html nao carrega noelle_avatar_tab_v19_8_2.css");
if (/avatar_v19_5_panel_bootstrap|noelle_v19_3_complete_ui_md/.test(controlsHtml)) err("src/controls.html ainda referencia runtime visual legado V19.3/V19.5");
else ok("src/controls.html sem script visual legado conhecido");

const avatarTab = read("src/renderer/noelle_avatar_tab_v19_8_2.js");
[
  "Room / Quarto",
  "Widget Mode",
  "Preview / Teste",
  "data-avatar-v1982-prev",
  "data-avatar-v1982-next"
].forEach((token) => avatarTab.includes(token) ? ok(`Aba Avatar contem: ${token}`) : err(`Aba Avatar nao contem: ${token}`));
[
  "BroadcastChannel",
  "Sincronizar Room",
  "noelle-v19-5-avatar-panel-script"
].forEach((token) => avatarTab.includes(token) ? err(`Aba Avatar contem texto legado: ${token}`) : ok(`Aba Avatar sem texto legado: ${token}`));

const previewHtml = read("src/avatar_carousel_preview_v19_8_2.html");
if (previewHtml.includes("avatar_carousel_preview_v19_8_2.bundle.js")) ok("Preview HTML aponta para bundle V19.8.2");
else err("Preview HTML nao aponta para bundle V19.8.2");

const bundlePath = path.join(root, "src", "renderer_dist", "avatar_carousel_preview_v19_8_2.bundle.js");
if (fs.existsSync(bundlePath) && fs.statSync(bundlePath).size > 1000) ok("Bundle V19.8.2 existe");
else warn("Bundle V19.8.2 ainda nao existe ou e pequeno. Rode opcao [4] do iniciar.bat.");

try {
  const pkg = JSON.parse(read("package.json"));
  if (pkg.version === "19.8.2-avatar-real-2026") ok(`package.json version: ${pkg.version}`);
  else warn(`package.json version nao e 19.8.2: ${pkg.version}`);
  if (pkg.scripts?.["diagnostico:v19.8.2"]) ok("package.json contem diagnostico:v19.8.2");
  else err("package.json nao contem diagnostico:v19.8.2");
} catch (e) {
  err(`package.json invalido: ${e.message}`);
}

const bat = read("iniciar.bat");
if (bat.includes("[1] Iniciar programa agora")) ok("iniciar.bat contem opcao [1] Iniciar programa agora");
else err("iniciar.bat nao contem opcao [1] Iniciar programa agora");
["Activate.ps1", "Set-ExecutionPolicy"].forEach((token) => bat.includes(token) ? err(`iniciar.bat contem legado: ${token}`) : ok(`iniciar.bat sem legado: ${token}`));

try {
  const manifestPath = path.join(root, "src", "assets", "avatar_manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) err("avatar_manifest.json nao e array JSON");
  else {
    const valid = manifest.filter((item) => /\.(vrm|glb|gltf)$/i.test(String(item.rel || item.file || item.path || "")));
    if (valid.length) ok(`avatar_manifest.json array com ${valid.length} avatar(es) VRM/GLB`);
    else err("avatar_manifest.json nao contem VRM/GLB valido");
  }
} catch (e) {
  err(`Nao foi possivel ler src/assets/avatar_manifest.json: ${e.message}`);
}

if (problems) {
  console.error(`\n[ERRO] Diagnostico V19.8.2 encontrou ${problems} problema(s).`);
  process.exit(1);
}
console.log(`\n[OK] Diagnostico V19.8.2 aprovado${warnings ? ` com ${warnings} aviso(s)` : ""}.`);
process.exit(0);
