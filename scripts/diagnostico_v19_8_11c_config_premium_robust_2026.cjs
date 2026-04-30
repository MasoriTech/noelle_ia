#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = process.cwd();
const VERSION = '19.8.11c-config-premium-robust-2026';

function log(msg) { console.log(msg); }
function ok(msg) { log(`[OK] ${msg}`); }
function warn(msg) { log(`[AVISO] ${msg}`); }
function err(msg) { log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), 'utf8'); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(`node --check pulado; arquivo não existe: ${rel}`);
  try {
    childProcess.execFileSync(process.execPath, ['--check', full(rel)], { stdio: 'pipe' });
    ok(`node --check ${rel}`);
  } catch (e) {
    err(`node --check falhou: ${rel}`);
  }
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.11c - diagnóstico Configurações Premium');
  log('================================================================');

  const required = [
    'src/renderer/noelle_config_premium_v19_8_11c.js',
    'src/styles/noelle_config_premium_v19_8_11c.css',
    'scripts/repair_v19_8_11c_config_premium_robust_2026.cjs',
    'scripts/diagnostico_v19_8_11c_config_premium_robust_2026.cjs',
    'iniciar.bat'
  ];
  required.forEach((rel) => exists(rel) ? ok(`${rel} existe`) : err(`${rel} não encontrado`));

  [
    'src/renderer/noelle_config_premium_v19_8_11c.js',
    'scripts/repair_v19_8_11c_config_premium_robust_2026.cjs',
    'scripts/diagnostico_v19_8_11c_config_premium_robust_2026.cjs',
    'scripts/status_v19_8_11c_config_premium_robust_2026.cjs'
  ].forEach(nodeCheck);

  if (exists('src/renderer/noelle_config_premium_v19_8_11c.js')) {
    const js = read('src/renderer/noelle_config_premium_v19_8_11c.js');
    [
      'robustFindSettingsSurface',
      'hardHideLegacyFloating',
      'renderDashboard',
      'noelle-v19811c-dashboard',
      'Yoru Ember',
      'Avatar Lab',
      'Room V19',
      'setInterval(schedule, 1500)'
    ].forEach((needle) => {
      js.includes(needle) ? ok(`runtime contém: ${needle}`) : err(`runtime não contém: ${needle}`);
    });
  }

  if (exists('src/styles/noelle_config_premium_v19_8_11c.css')) {
    const css = read('src/styles/noelle_config_premium_v19_8_11c.css');
    [
      'noelle-v19811c-dashboard',
      'grid-template-columns',
      'overflow',
      'data-noelle-legacy-floating',
      'noelle-v19811c-force-hidden',
      'yoru-ember'
    ].forEach((needle) => {
      css.toLowerCase().includes(needle.toLowerCase()) ? ok(`CSS contém: ${needle}`) : err(`CSS não contém: ${needle}`);
    });
  }

  if (exists('src/controls.html')) {
    const html = read('src/controls.html');
    html.includes('noelle_config_premium_v19_8_11c.js') ? ok('controls.html referencia JS V19.8.11c') : err('controls.html não referencia JS V19.8.11c');
    html.includes('noelle_config_premium_v19_8_11c.css') ? ok('controls.html referencia CSS V19.8.11c') : err('controls.html não referencia CSS V19.8.11c');
    [
      'noelle_settings_dashboard_v19_8_11b.js',
      'noelle_settings_dashboard_v19_8_11a.js',
      'noelle_settings_dashboard_v19_8_11.js',
      'noelle_theme_manager_v19_8_10a.js',
      'noelle_theme_manager_v19_8_10.js'
    ].forEach((old) => {
      html.includes(old) ? err(`controls.html ainda referencia legado: ${old}`) : ok(`controls.html sem legado: ${old}`);
    });
  } else {
    warn('src/controls.html não encontrado; diagnóstico parcial.');
  }

  if (exists('package.json')) {
    try {
      const pkg = JSON.parse(read('package.json'));
      pkg.version === VERSION ? ok(`package.json version: ${VERSION}`) : warn(`package.json version diferente: ${pkg.version || '(sem version)'}`);
      pkg.scripts?.['repair:v19.8.11c-config'] ? ok('package.json contém repair:v19.8.11c-config') : err('package.json não contém repair:v19.8.11c-config');
    } catch (e) {
      err(`package.json inválido: ${e.message}`);
    }
  }

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    bat.includes('[1] Iniciar programa agora') ? ok('iniciar.bat contém opção [1] Iniciar programa agora') : err('iniciar.bat sem opção [1]');
    bat.includes('Activate.ps1') ? err('iniciar.bat contém Activate.ps1') : ok('iniciar.bat sem Activate.ps1');
    bat.includes('Set-ExecutionPolicy') ? err('iniciar.bat contém Set-ExecutionPolicy') : ok('iniciar.bat sem Set-ExecutionPolicy');
  }

  if (process.exitCode) err('Diagnóstico V19.8.11c encontrou problemas.');
  else ok('Diagnóstico V19.8.11c aprovado.');
}

main();
