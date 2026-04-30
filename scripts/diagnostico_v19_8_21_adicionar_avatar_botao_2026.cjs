#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function log(msg){ console.log(msg); }
function ok(msg){ log('[OK] ' + msg); }
function warn(msg){ log('[AVISO] ' + msg); }
function err(msg){ log('[ERRO] ' + msg); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.21 - Botão Adicionar avatar');
  log('================================================================');

  const css = 'src/styles/noelle_add_avatar_button_v19_8_21.css';
  const js = 'src/renderer/noelle_add_avatar_button_v19_8_21.js';

  if (exists(css)) ok(css + ' existe');
  else err(css + ' não encontrado');

  if (exists(js)) {
    const code = read(js);
    ok(js + ' existe');
    if (code.includes('Adicionar avatar')) ok('runtime contém botão Adicionar avatar');
    else err('runtime não contém botão Adicionar avatar');

    if (code.includes('noelleAddAvatarButtonV19821')) ok('runtime expõe noelleAddAvatarButtonV19821');
    else err('runtime não expõe noelleAddAvatarButtonV19821');

    if (!/new\s+MutationObserver\s*\(|MutationObserver\s*\(/.test(code)) ok('runtime sem observador de DOM ativo');
    else err('runtime contém observador de DOM ativo');

    if (!code.includes('.remove(') && !code.includes('removeChild')) ok('runtime não remove DOM');
    else err('runtime remove DOM');
  } else err(js + ' não encontrado');

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_add_avatar_button_v19_8_21.css')) ok('controls.html contém CSS do botão');
    else err('controls.html não contém CSS do botão');
    if (html.includes('noelle_add_avatar_button_v19_8_21.js')) ok('controls.html contém runtime do botão');
    else err('controls.html não contém runtime do botão');
  } else err('src/controls.html não encontrado');

  if (exists('main.js')) {
    const main = read('main.js');
    if (main.includes('noelle:v19_8_21:import-avatar')) ok('main.js contém IPC V19.8.21');
    else err('main.js não contém IPC V19.8.21');
  } else warn('main.js não encontrado');

  if (exists('preload.js')) {
    const preload = read('preload.js');
    if (preload.includes('noelleAvatarImportV19821')) ok('preload.js expõe noelleAvatarImportV19821');
    else err('preload.js não expõe noelleAvatarImportV19821');
  } else warn('preload.js não encontrado');

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.21 encontrou problemas.');
  else ok('Diagnóstico V19.8.21 aprovado.');
}

main();
