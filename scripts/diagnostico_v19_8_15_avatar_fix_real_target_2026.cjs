#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function err(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }

function walk(dir){
  const out = [];
  function visit(d){
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'backups', '.git', '.venv', 'release'].includes(entry.name)) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) visit(p);
      else out.push(p);
    }
  }
  visit(dir);
  return out;
}

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.15 - Avatar fix real target');
  log('================================================================');

  if (exists('src/styles/noelle_avatar_canvas_fix_v19_8_15.css')) ok('CSS V19.8.15 existe');
  else err('CSS V19.8.15 não encontrado');

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_avatar_canvas_fix_v19_8_15.css')) ok('controls.html contém CSS V19.8.15');
    else err('controls.html não contém CSS V19.8.15');
  } else err('src/controls.html não encontrado');

  const roots = ['src/renderer', 'src/renderer_dist', 'src'].map(full).filter(fs.existsSync);
  const files = [];
  const seen = new Set();
  for (const root of roots) {
    for (const abs of walk(root)) {
      if (seen.has(abs)) continue;
      seen.add(abs);
      const r = path.relative(ROOT, abs).replace(/\\/g, '/');
      if (!/\.(js|mjs|cjs|html)$/i.test(r)) continue;
      if (!/(avatar|vrm|preview|carousel|lab)/i.test(r)) continue;
      files.push(abs);
    }
  }

  let transparentHits = 0;
  let poseHits = 0;
  let whiteHits = 0;

  for (const abs of files) {
    const r = path.relative(ROOT, abs).replace(/\\/g, '/');
    const content = fs.readFileSync(abs, 'utf8');
    if (/setClearColor\(0x000000,\s*0\)|alpha:\s*true|transparent/i.test(content)) transparentHits++;
    if (/noelleForceAvatarAPoseV19815|noelleApplyDefaultAPose/.test(content)) poseHits++;
    if (/(#ffffff|#fff|white)/i.test(content) && /(avatar|preview|canvas|stage)/i.test(content)) whiteHits++;
  }

  if (transparentHits) ok(`Arquivos com transparência detectados: ${transparentHits}`);
  else err('Nenhum ajuste de transparência detectado');

  if (poseHits) ok(`Arquivos com helper de A-pose detectados: ${poseHits}`);
  else warn('Nenhum helper de A-pose detectado; talvez o bundle real esteja minificado demais para patch seguro');

  if (whiteHits) warn(`Ainda existem referências a branco em arquivos avatar/preview: ${whiteHits}. Pode ser texto/tema e não necessariamente fundo.`);
  else ok('Nenhum fundo branco óbvio em arquivos avatar/preview');

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.15 encontrou problemas.');
  else ok('Diagnóstico V19.8.15 aprovado.');
}

main();
