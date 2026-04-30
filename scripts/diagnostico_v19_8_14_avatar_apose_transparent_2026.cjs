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
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'backups' || entry.name.startsWith('.git')) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) visit(p);
      else out.push(p);
    }
  }
  if (fs.existsSync(dir)) visit(dir);
  return out;
}

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.14 - Avatar microfix');
  log('================================================================');

  ['src/styles/noelle_avatar_microfix_v19_8_14.css', 'scripts/repair_v19_8_14_avatar_apose_transparent_2026.cjs', 'scripts/diagnostico_v19_8_14_avatar_apose_transparent_2026.cjs'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else err(`${rel} não encontrado`);
  });

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_avatar_microfix_v19_8_14.css')) ok('src/controls.html contém CSS do microfix');
    else err('src/controls.html não contém CSS do microfix');
  } else {
    err('src/controls.html não encontrado');
  }

  const files = walk(full('src/renderer')).filter((f) => /src[\\/]renderer[\\/].*(avatar|preview|vrm).*(js|mjs|cjs)$/i.test(f));
  if (!files.length) warn('Nenhum arquivo avatar/preview/vrm encontrado em src/renderer');

  let foundPose = 0;
  let foundTransparent = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const content = fs.readFileSync(abs, 'utf8');
    if (content.includes('noelleApplyDefaultAPose')) {
      ok(`${rel} contém helper de A-pose`);
      foundPose += 1;
    }
    if (/renderer\.setClearColor\(0x000000,\s*0\)/.test(content) || /alpha:\s*true/.test(content)) {
      ok(`${rel} contém ajuste de fundo transparente`);
      foundTransparent += 1;
    }
  }

  if (!foundPose) err('Nenhum arquivo renderer contém helper de A-pose');
  if (!foundTransparent) warn('Nenhum arquivo renderer com transparência detectado; o CSS ainda pode resolver o fundo branco');

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.14 encontrou problemas.');
  else ok('Diagnóstico V19.8.14 aprovado.');
}

main();
