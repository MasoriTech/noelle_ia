#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const ROOT = process.cwd();
function log(s){ console.log(s); }
function rel(p){ return path.relative(ROOT,p).replace(/\\/g,"/"); }
function checkNode(relPath){
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) { log(`[AVISO] ${relPath} nao existe.`); return true; }
  const r = cp.spawnSync(process.execPath, ["--check", abs], { encoding:"utf8" });
  if (r.status === 0) { log(`[OK] node --check ${relPath}`); return true; }
  log(`[ERRO] node --check falhou: ${relPath}`); if (r.stderr) log(r.stderr.trim()); return false;
}
function read(relPath){ const abs=path.join(ROOT,relPath); return fs.existsSync(abs)?fs.readFileSync(abs,"utf8"):""; }
function walk(dir,out=[]){ if(!fs.existsSync(dir)) return out; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const abs=path.join(dir,e.name); const r=rel(abs); if(/^(node_modules|\.git|backups|release|dist|out|build|\.venv|venv)(\/|$)/i.test(r)) continue; if(e.isDirectory()) walk(abs,out); else out.push(abs);} return out; }
let errors=0;
function ok(msg){ log(`[OK] ${msg}`); }
function err(msg){ errors++; log(`[ERRO] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function assertNo(text, needle, label){ if(text.includes(needle)) err(`${label} ainda contem: ${needle}`); else ok(`${label} sem: ${needle}`); }

log("================================================================");
log(" Noelle V19.8.7 - diagnóstico purge Avatar legado");
log("================================================================");

if (!checkNode("preload.js")) errors++;
if (!checkNode("scripts/repair_v19_8_7_purge_legacy_avatar_2026.cjs")) errors++;
if (!checkNode("scripts/diagnostico_v19_8_7_purge_legacy_avatar_2026.cjs")) errors++;

const preload = read("preload.js");
for (const s of ["noelle-v19-5-avatar-panel-script","noelle-v19-3-complete-runtime-script","avatar_v19_5_panel_bootstrap.js","noelle_v19_3_complete_ui_md.js","document.createElement(\"script\")","appendChild(script)"]) assertNo(preload, s, "preload.js");

const controls = read("src/controls.html");
for (const s of ["avatar_carousel_v19_7_6.bundle.js","avatar_carousel_v19_7_6","noelle_avatar_resize_guard_v19_8_3.js","noelle_avatar_route_guard_v19_8_4.js","noelle_avatar_overlay_killer_v19_8_5.js","noelle_avatar_overlay_launcher_killer_v19_8_6.js","avatar_v19_5_panel_bootstrap.js"]) assertNo(controls, s, "src/controls.html");

const activeFiles = [];
for (const dir of ["src/renderer_dist","src/renderer","src/styles"]) activeFiles.push(...walk(path.join(ROOT, dir)));
const legacyFilePatterns = [
  /avatar_carousel_v19_7_6/i,
  /avatar_carousel_v19_7_[0-9]+.*\.bundle\.js$/i,
  /noelle_avatar_resize_guard_v19_8_3/i,
  /noelle_avatar_route_guard_v19_8_4/i,
  /noelle_avatar_overlay_killer_v19_8_5/i,
  /noelle_avatar_overlay_launcher_killer_v19_8_6/i
];
const badFiles = activeFiles.filter(f => legacyFilePatterns.some(rx => rx.test(rel(f))));
if (badFiles.length) badFiles.forEach(f => err(`arquivo legado ainda no codigo ativo: ${rel(f)}`));
else ok("nenhum arquivo legado V19.7.6/V19.8.3-6 no codigo ativo");

const pkgRaw = read("package.json");
try {
  const pkg = JSON.parse(pkgRaw);
  if (String(pkg.version || "") === "19.8.7-purge-legacy-avatar-2026") ok("package.json version: 19.8.7-purge-legacy-avatar-2026"); else warn(`package.json version atual: ${pkg.version || "sem version"}`);
  if (pkg.scripts?.["diagnostico:v19.8.7"]) ok("package.json contem diagnostico:v19.8.7"); else err("package.json nao contem diagnostico:v19.8.7");
} catch (e) { err("package.json invalido"); }

const manifestRaw = read("src/assets/avatar_manifest.json");
try {
  const data = JSON.parse(manifestRaw || "[]");
  if (Array.isArray(data) && data.length > 0) ok(`avatar_manifest.json array com ${data.length} entrada(s)`); else err("avatar_manifest.json vazio ou nao array valido");
} catch (e) { err("avatar_manifest.json invalido"); }

const iniciar = read("iniciar.bat");
assertNo(iniciar, "Activate.ps1", "iniciar.bat");
assertNo(iniciar, "Set-ExecutionPolicy", "iniciar.bat");
if (iniciar.includes("[1] Iniciar programa agora")) ok("iniciar.bat contem opcao [1] Iniciar programa agora"); else err("iniciar.bat sem opcao [1] Iniciar programa agora");

if (errors) { log(`\n[ERRO] Diagnostico V19.8.7 encontrou ${errors} problema(s).`); process.exit(1); }
log("\n[OK] Diagnostico V19.8.7 aprovado.");
