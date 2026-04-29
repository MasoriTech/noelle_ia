"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const TEMPLATE = path.join(__dirname, "v19_7_5_templates");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP = path.join(ROOT, "backups", "v19_7_5_avatar_clean_carousel_2026_" + STAMP);

function p(...a){ return path.join(ROOT, ...a); }
function slash(s){ return String(s).replace(/\\/g,"/"); }
function mkdir(d){ fs.mkdirSync(d,{recursive:true}); }
function read(f){ return fs.existsSync(f) ? fs.readFileSync(f,"utf8") : ""; }
function write(f,s){ mkdir(path.dirname(f)); fs.writeFileSync(f,String(s).replace(/\r\n/g,"\n"),"utf8"); console.log("[OK] Atualizado:", path.relative(ROOT,f)); }
function backup(rel){ const f=p(...rel.split("/")); if(!fs.existsSync(f)) return; const out=path.join(BACKUP,rel); mkdir(path.dirname(out)); fs.copyFileSync(f,out); }
function copyTpl(srcRel,dstRel){ const src=path.join(TEMPLATE,...srcRel.split("/")); if(!fs.existsSync(src)) throw new Error("Template ausente: "+src); write(p(...dstRel.split("/")), fs.readFileSync(src,"utf8")); }
function title(name){ return path.basename(name,path.extname(name)).replace(/[_-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,m=>m.toUpperCase()) || name; }

function scanAvatars(){
  const roots=[p("src","assets"),p("src","assets","avatars"),p("src","assets","vrm"),p("src","assets","models"),p("assets","avatars")];
  const out=[]; const seen=new Set(); let visited=0;
  function walk(dir){
    if(!fs.existsSync(dir) || visited>5000) return;
    let entries=[]; try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const e of entries){
      if(visited++>5000) break; if(e.name.startsWith(".")) continue;
      const full=path.join(dir,e.name);
      if(e.isDirectory()) { if(!["node_modules","release","dist","out","backups"].includes(e.name)) walk(full); continue; }
      if(!e.isFile() || !/\.(vrm|glb)$/i.test(e.name)) continue;
      const rel=slash(path.relative(ROOT,full)); if(seen.has(rel.toLowerCase())) continue; seen.add(rel.toLowerCase());
      let url=rel.startsWith("src/") ? "./"+rel.slice(4) : "../"+rel;
      out.push({id:rel.toLowerCase().replace(/[^a-z0-9]+/g,"-"), name:title(e.name), url:slash(url), file:rel, kind:path.extname(e.name).slice(1).toUpperCase()});
    }
  }
  roots.forEach(walk);
  out.sort((a,b)=>((/noelle/i.test(a.name)?-3:/yoru/i.test(a.name)?-2:a.kind==="VRM"?-1:0)-(/noelle/i.test(b.name)?-3:/yoru/i.test(b.name)?-2:b.kind==="VRM"?-1:0)) || a.name.localeCompare(b.name,"pt-BR"));
  if(!out.length){
    out.push({id:"noelle-default",name:"Noelle",url:"./assets/Noelle.vrm",file:"src/assets/Noelle.vrm",kind:"VRM"});
    out.push({id:"yoru-default",name:"Yoru",url:"./assets/avatars/Yoru.vrm",file:"src/assets/avatars/Yoru.vrm",kind:"VRM"});
  }
  return out;
}

function nodeCheck(rel){ const f=p(...rel.split("/")); if(!fs.existsSync(f)) return; const r=cp.spawnSync(process.execPath,["--check",f],{encoding:"utf8"}); if(r.status!==0){process.stdout.write(r.stdout||""); process.stderr.write(r.stderr||""); throw new Error("node --check falhou: "+rel);} console.log("[OK] node --check", rel); }

try{
  console.log("============================================================");
  console.log(" Noelle - Avatar limpo com carrossel V19.7.5");
  console.log("============================================================");
  if(!fs.existsSync(TEMPLATE)) throw new Error("Copie scripts/v19_7_5_templates junto com este script.");
  ["src/avatar_lab_v19_6.html","src/renderer/avatar_lab_v19_6_app.js","src/renderer/avatar_v19_5_panel_bootstrap.js","src/renderer/avatar_manifest_runtime_v19_7_5.js","src/assets/avatar_manifest.json","scripts/build_avatar_lab_v19_6_2026.cjs","package.json","main.js","MEMORIA_GPT_NOELLE.md","iniciar.bat"].forEach(backup);
  console.log("[OK] Backup criado:", path.relative(ROOT,BACKUP));

  const avatars=scanAvatars();
  write(p("src","assets","avatar_manifest.json"), JSON.stringify({version:"19.7.5",generatedAt:new Date().toISOString(),avatars},null,2));
  write(p("src","renderer","avatar_manifest_runtime_v19_7_5.js"), "window.NoelleAvatarManifestV1975 = "+JSON.stringify(avatars,null,2)+";\n");
  console.log("[OK] Avatares encontrados no manifest:", avatars.length);

  copyTpl("src/avatar_lab_v19_6.html","src/avatar_lab_v19_6.html");
  copyTpl("src/renderer/avatar_lab_v19_6_app.js","src/renderer/avatar_lab_v19_6_app.js");
  copyTpl("src/renderer/avatar_v19_5_panel_bootstrap.js","src/renderer/avatar_v19_5_panel_bootstrap.js");
  copyTpl("scripts/build_avatar_lab_v19_6_2026.cjs","scripts/build_avatar_lab_v19_6_2026.cjs");

  const pkgPath=p("package.json");
  if(fs.existsSync(pkgPath)){ const pkg=JSON.parse(read(pkgPath)); pkg.scripts=pkg.scripts||{}; pkg.scripts["build:avatar-lab-v19.6"]="node scripts/build_avatar_lab_v19_6_2026.cjs"; pkg.scripts["diagnostico:avatar-clean"]="node scripts/diagnostico_v19_7_5_avatar_clean_2026.cjs"; pkg.scripts["diagnostico:v19.7.5-avatar-clean"]="node scripts/diagnostico_v19_7_5_avatar_clean_2026.cjs"; write(pkgPath, JSON.stringify(pkg,null,2)+"\n"); }

  const main=p("main.js");
  if(fs.existsSync(main)){ let s=read(main), old=s; s=s.replace(/width:\s*420\s*,\s*height:\s*680/g,"width: 620, height: 820").replace(/width:\s*1100\s*,\s*height:\s*760/g,"width: 1480, height: 900").replace(/width:\s*1200\s*,\s*height:\s*800/g,"width: 1480, height: 900"); if(s!==old) write(main,s); }

  const mem=p("MEMORIA_GPT_NOELLE.md");
  const note="\n\n## V19.7.5 Avatar Clean Carousel 2026\n- Aba Avatar limpa: avatar grande à esquerda, opções à direita e setas embaixo.\n- Remove da interface a tela técnica antiga de sincronização.\n- Avatar escolhe/personagem; Room usa quarto/objetos; Widget Mode mostra sem fundo; Preview/Teste fica seguro.\n- Sempre manter iniciar.bat atualizado nos próximos packs.\n";
  if(!fs.existsSync(mem)) write(mem,"# Memória Noelle\n"+note); else if(!read(mem).includes("V19.7.5 Avatar Clean Carousel")) write(mem,read(mem)+note); else console.log("[OK] MEMORIA_GPT_NOELLE.md já contém V19.7.5.");

  nodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
  nodeCheck("src/renderer/avatar_lab_v19_6_app.js");
  nodeCheck("src/renderer/avatar_v19_5_panel_bootstrap.js");
  console.log("[OK] Avatar limpo com carrossel aplicado.");
  console.log("[INFO] Rode: npm run build:avatar-lab-v19.6");
  process.exit(0);
}catch(err){ console.error("[ERRO]", err && err.message ? err.message : err); process.exit(1); }
