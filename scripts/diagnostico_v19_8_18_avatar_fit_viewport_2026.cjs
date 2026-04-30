#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function err(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }
function warn(msg){ log(`[AVISO] ${msg}`); }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.18 - Avatar fit viewport');
  log('================================================================');

  const css = 'src/styles/noelle_avatar_fit_viewport_v19_8_18.css';
  const js = 'src/renderer/noelle_avatar_fit_viewport_v19_8_18.js';

  if (exists(css)) ok(`${css} existe`);
  else err(`${css} não encontrado`);

  if (exists(js)) {
    const code = read(js);
    ok(`${js} existe`);
    if (code.includes('noelleAvatarFitV19818')) ok('guard expõe noelleAvatarFitV19818');
    else err('guard não expõe noelleAvatarFitV19818');
    if (!code.includes('MutationObserver')) ok('guard sem MutationObserver');
    else err('guard contém MutationObserver');
    if (!code.includes('.remove(') && !code.includes('removeChild')) ok('guard não remove DOM');
    else err('guard remove DOM');
  } else err(`${js} não encontrado`);

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_avatar_fit_viewport_v19_8_18.css')) ok('controls.html contém CSS fit viewport');
    else err('controls.html não contém CSS fit viewport');
    if (html.includes('noelle_avatar_fit_viewport_v19_8_18.js')) ok('controls.html contém JS fit viewport');
    else err('controls.html não contém JS fit viewport');
  } else err('src/controls.html não encontrado');

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.18 encontrou problemas.');
  else ok('Diagnóstico V19.8.18 aprovado.');
}

main();
