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

const BAD = [
  'noelle_config_dashboard_v19_8_11.js',
  'noelle_config_dashboard_v19_8_11a.js',
  'noelle_config_dashboard_v19_8_11b.js',
  'noelle_config_dashboard_v19_8_11c.js',
  'noelle_safe_theme_recovery_v19_8_11d.js',
  'noelle_overlay_guard_v19_8_12.js',
  'Modo recuperação ativo.',
  'O runtime visual agressivo foi removido.'
];

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.13 - Rollback antigo funcional');
  log('================================================================');

  if (!exists('src/controls.html')) {
    err('src/controls.html não encontrado.');
  } else {
    const html = read('src/controls.html');
    ['Noelle', 'Principal', 'Avatar', 'Chat IA', 'Configura', 'Sobre'].forEach((token) => {
      if (html.toLowerCase().includes(token.toLowerCase())) ok(`controls.html contém: ${token}`);
      else warn(`controls.html pode não conter texto esperado: ${token}`);
    });

    BAD.forEach((token) => {
      if (html.includes(token)) err(`controls.html ainda contém runtime/texto ruim: ${token}`);
      else ok(`controls.html sem runtime/texto ruim: ${token}`);
    });

    if (html.length > 1500) ok(`controls.html parece ter tamanho válido: ${html.length} bytes`);
    else err(`controls.html pequeno demais: ${html.length} bytes`);
  }

  if (exists('preload.js')) {
    const preload = read('preload.js');
    if (preload.includes('contextBridge.exposeInMainWorld("noelleAPI"') || preload.includes("contextBridge.exposeInMainWorld('noelleAPI'")) ok('preload preserva noelleAPI');
    else warn('preload pode não expor noelleAPI');
    if (!preload.includes('document.createElement("script")') && !preload.includes("document.createElement('script')")) ok('preload sem injeção visual por script');
    else err('preload ainda injeta script visual');
  }

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.13 encontrou problemas.');
  else ok('Diagnóstico V19.8.13 aprovado.');
}

main();
