#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.12-stop-repeated-text-2026';

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function err(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }

const BAD_TOKENS = [
  'noelle_theme_manager_v19_8_10.js',
  'noelle_theme_manager_v19_8_10a.js',
  'noelle_config_dashboard_v19_8_11.js',
  'noelle_config_dashboard_v19_8_11a.js',
  'noelle_config_dashboard_v19_8_11b.js',
  'noelle_config_dashboard_v19_8_11c.js',
  'noelle_safe_theme_recovery_v19_8_11d.js',
  'Modo recuperação ativo.',
  'O runtime visual agressivo foi removido.',
  'Visual final da Noelle, sem botões flutuantes antigos e com tema salvo.'
];

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.12 - Diagnóstico Stop Repeated Text');
  log('================================================================');

  [
    'src/styles/noelle_static_theme_v19_8_12.css',
    'src/renderer/noelle_overlay_guard_v19_8_12.js',
    'scripts/repair_v19_8_12_stop_repeated_text_2026.cjs',
    'scripts/diagnostico_v19_8_12_stop_repeated_text_2026.cjs'
  ].forEach((rel) => exists(rel) ? ok(`${rel} existe`) : err(`${rel} não encontrado`));

  if (exists('src/renderer/noelle_overlay_guard_v19_8_12.js')) {
    const js = read('src/renderer/noelle_overlay_guard_v19_8_12.js');
    if (!/MutationObserver/.test(js)) ok('guard sem MutationObserver');
    else err('guard contém MutationObserver');
    if (!/createElement|insertAdjacentHTML|innerHTML\s*=/.test(js)) ok('guard não cria painel/texto');
    else err('guard cria painel/texto');
    if (!/\.remove\(\)|removeChild/.test(js)) ok('guard não remove containers');
    else err('guard remove containers');
  }

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    if (html.includes('noelle_static_theme_v19_8_12.css')) ok('controls.html contém CSS V19.8.12');
    else err('controls.html não contém CSS V19.8.12');
    if (html.includes('noelle_overlay_guard_v19_8_12.js')) ok('controls.html contém guard V19.8.12');
    else err('controls.html não contém guard V19.8.12');

    for (const token of BAD_TOKENS) {
      if (html.includes(token)) err(`controls.html ainda contém token repetidor/legado: ${token}`);
      else ok(`controls.html sem token repetidor/legado: ${token}`);
    }
  } else {
    err('src/controls.html não encontrado');
  }

  if (exists('package.json')) {
    try {
      const pkg = JSON.parse(read('package.json'));
      if (pkg.version === VERSION) ok(`package.json version: ${VERSION}`);
      else warn(`package.json version diferente: ${pkg.version || '(sem version)'}`);
    } catch (e) {
      err(`package.json inválido: ${e.message}`);
    }
  }

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1]');
    else err('iniciar.bat sem opção [1]');
    if (!/Activate\.ps1|Set-ExecutionPolicy/i.test(bat)) ok('iniciar.bat sem PowerShell/Activate.ps1');
    else err('iniciar.bat contém PowerShell/Activate.ps1');
  }

  if (process.exitCode) err('Diagnóstico V19.8.12 encontrou problemas.');
  else ok('Diagnóstico V19.8.12 aprovado.');
}

main();
