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

const TARGETS = [
  'src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js',
  'src/renderer/avatar_carousel_preview_v19_8_2_app.mjs'
];

function checkTarget(rel) {
  if (!exists(rel)) {
    warn(`${rel} não encontrado`);
    return;
  }
  const content = read(rel);

  if (content.includes('Arraste para girar')) ok(`${rel} é target do preview`);
  else warn(`${rel} não contém frase do preview`);

  if (content.includes('noelleApplyAPoseV19817')) ok(`${rel} contém A-pose V19.8.17`);
  else err(`${rel} não contém A-pose V19.8.17`);

  if (/setClearColor\(0x080706,\s*1\)/.test(content) || /scene\.background\s*=\s*new\s+(?:THREE\.)?Color\(0x080706\)/.test(content)) {
    ok(`${rel} contém fundo escuro real`);
  } else {
    err(`${rel} não contém fundo escuro real`);
  }

  if (/setClearColor\(0x000000,\s*0\)/.test(content)) {
    warn(`${rel} ainda contém clear transparente antigo`);
  }
}

function main() {
  log('================================================================');
  log(' Diagnóstico V19.8.17 - Avatar targeted');
  log('================================================================');

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_avatar_target_v19_8_17.css')) ok('controls.html contém CSS V19.8.17');
    else err('controls.html não contém CSS V19.8.17');
    if (html.includes('noelle_avatar_target_guard_v19_8_17.js')) ok('controls.html contém guard V19.8.17');
    else err('controls.html não contém guard V19.8.17');
  } else err('src/controls.html não encontrado');

  if (exists('src/styles/noelle_avatar_target_v19_8_17.css')) ok('CSS V19.8.17 existe');
  else err('CSS V19.8.17 não existe');

  if (exists('src/renderer/noelle_avatar_target_guard_v19_8_17.js')) ok('guard V19.8.17 existe');
  else err('guard V19.8.17 não existe');

  TARGETS.forEach(checkTarget);

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.17 encontrou problemas.');
  else ok('Diagnóstico V19.8.17 aprovado.');
}

main();
