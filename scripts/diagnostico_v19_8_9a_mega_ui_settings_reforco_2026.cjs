"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = process.cwd();
let errors = 0;
let warnings = 0;
function rel(...p) { return path.join(ROOT, ...p); }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function read(p, fallback = "") { try { return fs.readFileSync(p, "utf8"); } catch { return fallback; } }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { warnings++; console.log(`[AVISO] ${msg}`); }
function fail(msg) { errors++; console.error(`[ERRO] ${msg}`); }
function nodeCheck(file) { const r = spawnSync(process.execPath, ["--check", rel(file)], { encoding: "utf8" }); if (r.status === 0) ok(`node --check ${file}`); else { fail(`node --check falhou: ${file}`); console.error(r.stderr || r.stdout || ""); } }
function contains(file, needle, label = needle) { const txt = read(rel(file)); if (txt.includes(needle)) ok(`${file} contém: ${label}`); else fail(`${file} não contém: ${label}`); }
function notContains(file, needle, label = needle) { const txt = read(rel(file)); if (!txt.includes(needle)) ok(`${file} sem legado: ${label}`); else fail(`${file} ainda contém legado: ${label}`); }
console.log("================================================================");
console.log(" Noelle V19.8.9a - diagnóstico Mega UI/Settings Reforço");
console.log("================================================================");
[
  "src/renderer/noelle_ui_polish_v19_8_9a.js",
  "src/styles/noelle_ui_polish_v19_8_9a.css",
  "scripts/repair_v19_8_9a_mega_ui_settings_reforco_2026.cjs",
  "scripts/status_v19_8_9a_mega_ui_settings_reforco_2026.cjs"
].forEach((file) => exists(rel(file)) ? ok(`${file} existe`) : fail(`${file} ausente`));
nodeCheck("src/renderer/noelle_ui_polish_v19_8_9a.js");
nodeCheck("scripts/repair_v19_8_9a_mega_ui_settings_reforco_2026.cjs");
nodeCheck("scripts/status_v19_8_9a_mega_ui_settings_reforco_2026.cjs");
contains("src/controls.html", "noelle_ui_polish_v19_8_9a.css", "CSS V19.8.9a instalado");
contains("src/controls.html", "noelle_ui_polish_v19_8_9a.js", "runtime V19.8.9a instalado");
notContains("src/controls.html", "noelle_ui_polish_v19_8_9.js", "runtime V19.8.9 antigo duplicado");
notContains("src/controls.html", "noelle_ui_polish_v19_8_9.css", "CSS V19.8.9 antigo duplicado");
contains("src/renderer/noelle_ui_polish_v19_8_9a.js", "killLegacyOverlays", "killer forte de overlays");
contains("src/renderer/noelle_ui_polish_v19_8_9a.js", "removeLegacyElement", "remoção real de overlay fixed/absolute");
contains("src/renderer/noelle_ui_polish_v19_8_9a.js", "renderSettingsPage", "Configurações avançadas");
contains("src/styles/noelle_ui_polish_v19_8_9a.css", "noelle-v1989a-hidden-legacy", "CSS anti-overlay reforçado");
contains("src/styles/noelle_ui_polish_v19_8_9a.css", "@media", "responsividade");
const preload = read(rel("preload.js"));
if (preload) {
  ok("preload.js encontrado");
  ["noelle-v19-5-avatar-panel-script", "noelle-v19-3-complete-runtime-script", "avatar_v19_5_panel_bootstrap.js", "noelle_v19_3_complete_ui_md.js", "document.createElement(\"script\")", "appendChild(script)"].forEach((needle) => notContains("preload.js", needle));
  ["contextBridge.exposeInMainWorld(\"noelleAPI\"", "contextBridge.exposeInMainWorld(\"desktopWidget\""].forEach((needle) => contains("preload.js", needle));
} else warn("preload.js não encontrado para diagnóstico.");
try {
  const pkg = JSON.parse(read(rel("package.json"), "{}"));
  if (pkg.version === "19.8.9a-mega-ui-settings-reforco-2026") ok(`package.json version: ${pkg.version}`); else warn(`package.json version não é V19.8.9a: ${pkg.version || "ausente"}`);
  if (pkg.scripts?.["diagnostico:v19.8.9a"]) ok("package.json contém diagnostico:v19.8.9a"); else warn("package.json sem script diagnostico:v19.8.9a");
} catch (err) { fail(`package.json inválido: ${err.message}`); }
const bat = read(rel("iniciar.bat"));
if (bat) {
  if (/\[1\].*Iniciar programa agora/i.test(bat) || /Iniciar programa agora/i.test(bat)) ok("iniciar.bat contém opção [1] Iniciar programa agora"); else warn("iniciar.bat não mostra claramente opção [1] Iniciar programa agora");
  if (/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) fail("iniciar.bat ainda contém PowerShell/Activate.ps1"); else ok("iniciar.bat sem PowerShell/Activate.ps1");
} else fail("iniciar.bat ausente");
const manifestPath = rel("src", "assets", "avatar_manifest.json");
if (exists(manifestPath)) {
  try { const data = JSON.parse(read(manifestPath)); if (Array.isArray(data)) ok(`avatar_manifest.json array com ${data.length} entrada(s)`); else warn("avatar_manifest.json existe, mas não é array JSON"); } catch (err) { warn(`avatar_manifest.json inválido: ${err.message}`); }
} else warn("avatar_manifest.json ausente; aba Avatar pode usar fallback.");
if (errors) { console.error(`\n[ERRO] Diagnóstico V19.8.9a encontrou ${errors} problema(s).`); process.exit(1); }
console.log(`\n[OK] Diagnóstico V19.8.9a aprovado${warnings ? ` com ${warnings} aviso(s)` : ""}.`);
process.exit(0);
