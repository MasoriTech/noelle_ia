#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function relPath(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(relPath(rel)); }
function read(rel) { return fs.readFileSync(relPath(rel), 'utf8'); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { warnings++; console.log(`[AVISO] ${msg}`); }
function err(msg) { errors++; console.log(`[ERRO] ${msg}`); }

function nodeCheck(rel) {
  if (!exists(rel)) { err(`${rel} não encontrado`); return; }
  const res = spawnSync(process.execPath, ['--check', relPath(rel)], { encoding: 'utf8' });
  if (res.status === 0) ok(`node --check ${rel}`);
  else err(`node --check falhou: ${rel}\n${res.stderr || res.stdout}`);
}

function mustContain(rel, needle, label = needle) {
  if (!exists(rel)) { err(`${rel} não encontrado`); return; }
  const content = read(rel);
  if (content.includes(needle)) ok(`${rel} contém: ${label}`);
  else err(`${rel} não contém: ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  if (!exists(rel)) { warn(`${rel} não encontrado para checar ausência: ${label}`); return; }
  const content = read(rel);
  if (!content.includes(needle)) ok(`${rel} sem legado: ${label}`);
  else err(`${rel} ainda contém legado/conflito: ${label}`);
}

function checkPackage() {
  if (!exists('package.json')) { err('package.json não encontrado'); return; }
  try {
    const pkg = JSON.parse(read('package.json'));
    if (pkg.version === '19.8.10-yoru-ember-themes-2026') ok(`package.json version: ${pkg.version}`);
    else warn(`package.json version não é V19.8.10: ${pkg.version}`);
    const scripts = pkg.scripts || {};
    if (scripts['diagnostico:v19.8.10-themes']) ok('package.json contém diagnostico:v19.8.10-themes');
    else err('package.json não contém diagnostico:v19.8.10-themes');
  } catch (e) {
    err(`package.json inválido: ${e.message}`);
  }
}

function checkIniciar() {
  if (!exists('iniciar.bat')) { err('iniciar.bat não encontrado'); return; }
  const bat = read('iniciar.bat');
  if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1] Iniciar programa agora');
  else err('iniciar.bat não contém opção [1] Iniciar programa agora');
  for (const legacy of ['Activate.ps1', 'Set-ExecutionPolicy', 'powershell -ExecutionPolicy']) {
    if (!bat.includes(legacy)) ok(`iniciar.bat sem PowerShell legado: ${legacy}`);
    else err(`iniciar.bat contém PowerShell legado: ${legacy}`);
  }
}

function checkThemeFiles() {
  nodeCheck('src/renderer/noelle_theme_manager_v19_8_10.js');
  nodeCheck('scripts/repair_v19_8_10_yoru_ember_themes_2026.cjs');
  nodeCheck('scripts/diagnostico_v19_8_10_yoru_ember_themes_2026.cjs');
  nodeCheck('scripts/status_v19_8_10_yoru_ember_themes_2026.cjs');

  const css = 'src/styles/noelle_themes_v19_8_10.css';
  const js = 'src/renderer/noelle_theme_manager_v19_8_10.js';
  mustContain(css, 'html[data-noelle-theme="yoru-ember"]', 'tema Yoru Ember');
  mustContain(css, 'html[data-noelle-theme="noelle-noir"]', 'tema Noelle Noir');
  mustContain(css, 'html[data-noelle-theme="yoru-midnight"]', 'tema Yoru Midnight');
  mustContain(css, 'html[data-noelle-theme="sakura-dark"]', 'tema Sakura Dark');
  mustContain(css, 'html[data-noelle-theme="cyber-violet"]', 'tema Cyber Violet');
  mustContain(css, 'html[data-noelle-theme="crimson-glass"]', 'tema Crimson Glass');
  mustContain(css, 'html[data-noelle-theme="forest-spirit"]', 'tema Forest Spirit');
  mustContain(css, 'html[data-noelle-theme="light-pearl"]', 'tema Light Pearl');
  mustContain(css, '.noelle-btn-primary', 'botões primary');
  mustContain(css, '.noelle-btn-room', 'botões Room');
  mustContain(css, '.noelle-btn-widget', 'botões Widget');
  mustContain(css, '.noelle-btn-preview', 'botões Preview');
  mustContain(css, 'flex-wrap', 'botões acompanham tela com flex-wrap');
  mustContain(css, '@media (max-width: 680px)', 'breakpoint mobile');

  mustContain(js, "const DEFAULT_THEME = 'yoru-ember'", 'Yoru Ember como padrão');
  mustContain(js, 'window.noelleTheme', 'API window.noelleTheme');
  mustContain(js, 'enhanceButtons', 'reforço de botões');
  mustContain(js, 'installThemePanel', 'painel de temas em Configurações');
  mustContain(js, 'hideLegacyFloating', 'bloqueio de overlays legados');
}

function checkControls() {
  if (!exists('src/controls.html')) { warn('src/controls.html não encontrado'); return; }
  mustContain('src/controls.html', 'noelle_themes_v19_8_10.css', 'CSS de temas V19.8.10');
  mustContain('src/controls.html', 'noelle_theme_manager_v19_8_10.js', 'runtime de temas V19.8.10');
}

function checkPreloadLegacy() {
  if (!exists('preload.js')) { warn('preload.js não encontrado'); return; }
  for (const legacy of [
    'noelle-v19-5-avatar-panel-script',
    'noelle-v19-3-complete-runtime-script',
    'avatar_v19_5_panel_bootstrap.js',
    'noelle_v19_3_complete_ui_md.js',
    'NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN',
    'NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN'
  ]) mustNotContain('preload.js', legacy, legacy);
}

function checkSettingsJson() {
  if (!exists('data/noelle_theme_settings.json')) { warn('data/noelle_theme_settings.json não encontrado; rode reparo V19.8.10'); return; }
  try {
    const settings = JSON.parse(read('data/noelle_theme_settings.json'));
    if (settings.defaultTheme === 'yoru-ember') ok('settings defaultTheme = yoru-ember');
    else err('settings defaultTheme não é yoru-ember');
    if (Array.isArray(settings.themes) && settings.themes.length >= 6) ok(`settings contém ${settings.themes.length} temas`);
    else err('settings não contém lista de temas válida');
  } catch (e) {
    err(`data/noelle_theme_settings.json inválido: ${e.message}`);
  }
}

console.log('================================================================');
console.log(' Noelle/Yoru V19.8.10 - Diagnóstico Temas Yoru Ember');
console.log('================================================================');
checkThemeFiles();
checkControls();
checkPackage();
checkIniciar();
checkPreloadLegacy();
checkSettingsJson();

if (errors) {
  console.log(`\n[ERRO] Diagnóstico V19.8.10 encontrou ${errors} problema(s).`);
  process.exit(1);
}
if (warnings) console.log(`\n[AVISO] Diagnóstico V19.8.10 aprovado com ${warnings} aviso(s).`);
else console.log('\n[OK] Diagnóstico V19.8.10 aprovado.');
