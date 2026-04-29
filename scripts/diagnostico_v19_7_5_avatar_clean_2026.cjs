"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const ROOT = process.cwd();
let failed = false;
function p(...a){ return path.join(ROOT,...a); }
function read(rel){ const f=p(...rel.split("/")); return fs.existsSync(f)?fs.readFileSync(f,"utf8"):""; }
function ok(m){ console.log("[OK] "+m); }
function warn(m){ console.log("[AVISO] "+m); }
function fail(m){ failed=true; console.error("[ERRO] "+m); }
function exists(rel){ fs.existsSync(p(...rel.split("/"))) ? ok("Existe: "+rel) : fail("Faltando: "+rel); }
function nodeCheck(rel){ const f=p(...rel.split("/")); if(!fs.existsSync(f)) return; const r=cp.spawnSync(process.execPath,["--check",f],{encoding:"utf8"}); if(r.status===0) ok("node --check "+rel); else { process.stdout.write(r.stdout||""); process.stderr.write(r.stderr||""); fail("node --check falhou: "+rel); } }
function has(rel,rx,label){ rx.test(read(rel)) ? ok(label+" em "+rel) : fail("Não achei "+label+" em "+rel); }
function clean(rel,rx,label){ rx.test(read(rel)) ? fail("Texto antigo encontrado em "+rel+": "+label) : ok("Limpo de "+label+": "+rel); }
console.log("============================================================");
console.log(" Diagnóstico Noelle Avatar limpo V19.7.5");
console.log("============================================================");
[
"src/avatar_lab_v19_6.html",
"src/renderer/avatar_lab_v19_6_app.js",
"src/renderer/avatar_v19_5_panel_bootstrap.js",
"src/renderer/avatar_manifest_runtime_v19_7_5.js",
"src/assets/avatar_manifest.json",
"scripts/build_avatar_lab_v19_6_2026.cjs",
"iniciar.bat"
].forEach(exists);
nodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
nodeCheck("src/renderer/avatar_lab_v19_6_app.js");
nodeCheck("src/renderer/avatar_v19_5_panel_bootstrap.js");
has("src/avatar_lab_v19_6.html",/id="prevAvatar"/,"seta esquerda");
has("src/avatar_lab_v19_6.html",/id="nextAvatar"/,"seta direita");
has("src/avatar_lab_v19_6.html",/id="btnRoom"/,"botão Room");
has("src/avatar_lab_v19_6.html",/id="btnWidget"/,"botão Widget");
has("src/avatar_lab_v19_6.html",/id="btnPreview"/,"botão Preview");
has("src/renderer/avatar_v19_5_panel_bootstrap.js",/avatar_lab_v19_6\.html\?embed=1/,"iframe limpo no Avatar");
for(const rel of ["src/avatar_lab_v19_6.html","src/renderer/avatar_lab_v19_6_app.js","src/renderer/avatar_v19_5_panel_bootstrap.js"]){
  clean(rel,/Preview real do VRM V19\.5/i,"título antigo V19.5");
  clean(rel,/Avatar, Room e animações/i,"painel técnico antigo");
  clean(rel,/Sincronizar Room/i,"botão antigo");
  clean(rel,/Room sync/i,"status antigo");
  clean(rel,/noelle-avatar-room-sync/i,"canal antigo");
  clean(rel,/noelle\.avatar\.sync/i,"chave antiga");
}
if(/^await\s+load(?:MotionManifest|Avatar)\b/m.test(read("src/renderer/avatar_lab_v19_6_app.js"))) fail("Top-level await antigo encontrado no app."); else ok("App sem top-level await antigo.");
try{ const manifest=JSON.parse(read("src/assets/avatar_manifest.json")||"{}"); const count=Array.isArray(manifest.avatars)?manifest.avatars.length:0; count>0 ? ok("Avatares no manifest: "+count) : warn("Manifest existe, mas não tem avatares reais."); }catch(e){ fail("Manifest JSON inválido: "+e.message); }
if(fs.existsSync(p("src","renderer_dist","avatar_lab_v19_6.bundle.js"))) ok("Bundle do Avatar existe."); else warn("Bundle ainda não existe. Rode: npm run build:avatar-lab-v19.6");
if(failed){ console.error("[ERRO] Diagnóstico V19.7.5 falhou."); process.exit(1); }
console.log("[OK] Diagnóstico V19.7.5 aprovado.");
process.exit(0);
