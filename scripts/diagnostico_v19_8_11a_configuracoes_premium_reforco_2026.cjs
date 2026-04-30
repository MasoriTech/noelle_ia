#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const VERSION = '19.8.11a-configuracoes-premium-reforco-2026';
let problems = 0;

function log(s) { console.log(s); }
function ok(s) { log(`[OK] ${s}`); }
function warn(s) { log(`[AVISO] ${s}`); }
function err(s) { problems += 1; log(`[ERRO] ${s}`); }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), 'utf8'); }
function nodeCheck(rel) {
  if (!exists(rel)) { err(`${rel} não encontrado`); return; }
  const r = spawnSync(process.execPath, ['--check', full(rel)], { encoding: 'utf8' });
  if (r.status === 0) ok(`node --check ${rel}`);
  else err(`node --check falhou: ${rel}\n${r.stderr || r.stdout}`);
}

function contains(rel, needle, label = needle) {
  if (!exists(rel)) { err(`${rel} não encontrado`); return false; }
  const txt = read(rel);
  if (txt.includes(needle)) { ok(`${rel} contém: ${label}`); return true; }
  err(`${rel} não contém: ${label}`); return false;
}

function notContains(rel, needle, label = needle) {
  if (!exists(rel)) { err(`${rel} não encontrado`); return false; }
  const txt = read(rel);
  if (!txt.includes(needle)) { ok(`${rel} sem legado: ${label}`); return true; }
  err(`${rel} ainda contém legado: ${label}`); return false;
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.11a - diagnóstico Configurações Premium');
  log('================================================================');

  [
    'src/renderer/noelle_settings_dashboard_v19_8_11a.js',
    'scripts/repair_v19_8_11a_configuracoes_premium_reforco_2026.cjs',
    'scripts/diagnostico_v19_8_11a_configuracoes_premium_reforco_2026.cjs',
    'scripts/status_v19_8_11a_configuracoes_premium_reforco_2026.cjs'
  ].forEach(nodeCheck);

  contains('src/controls.html', 'noelle_settings_dashboard_v19_8_11a.css', 'CSS V19.8.11a');
  contains('src/controls.html', 'noelle_settings_dashboard_v19_8_11a.js', 'runtime V19.8.11a');
  notContains('src/controls.html', 'noelle_settings_dashboard_v19_8_11.js', 'runtime V19.8.11 antigo');
  notContains('src/controls.html', 'noelle_theme_manager_v19_8_10', 'runtime temas V19.8.10 antigo');

  const jsRel = 'src/renderer/noelle_settings_dashboard_v19_8_11a.js';
  contains(jsRel, 'window.__NOELLE_SETTINGS_DASHBOARD_V19811A__', 'trava anti-duplicação');
  contains(jsRel, "card('Aparência'", 'card Aparência no lugar de Interface');
  notContains(jsRel, "card('Interface'", 'card Interface removido');
  contains(jsRel, 'purgeLegacySettingsCards', 'purga de cards legados');
  contains(jsRel, 'hideLegacyFloating', 'bloqueio Avatar Lab / Room V19');
  contains(jsRel, 'Yoru Ember', 'tema Yoru Ember');
  contains(jsRel, 'noelle-v19811a-compact-settings', 'modo compacto da página');

  contains('src/styles/noelle_settings_dashboard_v19_8_11a.css', 'noelle-v19811a-compact-settings', 'CSS modo compacto');
  contains('src/styles/noelle_settings_dashboard_v19_8_11a.css', '@media (max-width: 900px)', 'CSS responsivo');

  if (exists('package.json')) {
    try {
      const pkg = JSON.parse(read('package.json'));
      if (pkg.version === VERSION) ok(`package.json version: ${VERSION}`); else warn(`package.json version diferente: ${pkg.version || '(sem version)'}`);
      if (pkg.scripts && pkg.scripts['diagnostico:v19.8.11a-config']) ok('package.json contém script diagnostico:v19.8.11a-config');
      else err('package.json não contém script diagnostico:v19.8.11a-config');
    } catch (e) { err(`package.json inválido: ${e.message}`); }
  } else err('package.json não encontrado');

  if (exists('preload.js')) {
    const preload = read('preload.js');
    ['avatar_v19_5_panel_bootstrap.js', 'noelle_v19_3_complete_ui_md.js', 'noelle-v19-5-avatar-panel-script'].forEach((legacy) => {
      if (preload.includes(legacy)) err(`preload.js contém legado: ${legacy}`);
      else ok(`preload.js sem legado: ${legacy}`);
    });
  }

  if (exists('iniciar.bat')) {
    const bat = read('iniciar.bat');
    if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1] Iniciar programa agora');
    else err('iniciar.bat não contém opção [1] Iniciar programa agora');
    ['Activate.ps1', 'Set-ExecutionPolicy'].forEach((legacy) => {
      if (bat.includes(legacy)) err(`iniciar.bat contém legado: ${legacy}`);
      else ok(`iniciar.bat sem legado: ${legacy}`);
    });
  } else err('iniciar.bat não encontrado');

  if (problems) {
    log(`\n[ERRO] Diagnóstico V19.8.11a encontrou ${problems} problema(s).`);
    process.exit(1);
  }
  log('\n[OK] Diagnóstico V19.8.11a aprovado.');
}

main();
