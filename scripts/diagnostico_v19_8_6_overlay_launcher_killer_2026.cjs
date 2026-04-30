#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function p(...parts) { return path.join(ROOT, ...parts); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { warnings++; console.log(`[AVISO] ${msg}`); }
function err(msg) { errors++; console.log(`[ERRO] ${msg}`); }

function nodeCheck(rel) {
  const file = p(rel);
  if (!exists(file)) return err(`${rel} não existe`);
  try {
    cp.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok(`node --check ${rel}`);
  } catch (e) {
    err(`node --check falhou: ${rel}`);
    const out = Buffer.concat([e.stdout || Buffer.alloc(0), e.stderr || Buffer.alloc(0)]).toString();
    if (out.trim()) console.log(out.trim());
  }
}

function contains(rel, needle, label) {
  const file = p(rel);
  if (!exists(file)) return err(`${rel} não existe`);
  const content = read(file);
  if (content.includes(needle)) ok(`${rel} contém: ${label || needle}`);
  else err(`${rel} não contém: ${label || needle}`);
}

function notContains(rel, needle, label) {
  const file = p(rel);
  if (!exists(file)) return err(`${rel} não existe`);
  const content = read(file);
  if (!content.includes(needle)) ok(`${rel} sem legado: ${label || needle}`);
  else err(`${rel} ainda contém legado: ${label || needle}`);
}

function checkManifest() {
  const file = p('src', 'assets', 'avatar_manifest.json');
  if (!exists(file)) return warn('avatar_manifest.json não encontrado; o Avatar pode depender de manifest gerado por fase anterior.');
  try {
    const data = JSON.parse(read(file));
    if (Array.isArray(data)) ok(`avatar_manifest.json é array com ${data.length} entrada(s)`);
    else err('avatar_manifest.json existe, mas não é array JSON');
  } catch (e) {
    err(`avatar_manifest.json inválido: ${e.message}`);
  }
}

function checkPackage() {
  const file = p('package.json');
  if (!exists(file)) return err('package.json não existe');
  try {
    const pkg = JSON.parse(read(file));
    if (String(pkg.version || '').includes('19.8.6')) ok(`package.json version: ${pkg.version}`);
    else warn(`package.json version não é V19.8.6: ${pkg.version}`);
    const scripts = pkg.scripts || {};
    if (scripts['diagnostico:v19.8.6-overlay']) ok('package.json contém diagnostico:v19.8.6-overlay');
    else err('package.json não contém diagnostico:v19.8.6-overlay');
  } catch (e) {
    err(`package.json inválido: ${e.message}`);
  }
}

function checkIniciar() {
  const file = p('iniciar.bat');
  if (!exists(file)) return warn('iniciar.bat não encontrado na raiz.');
  const bat = read(file);
  if (bat.includes('[1] Iniciar programa agora')) ok('iniciar.bat contém opção [1] Iniciar programa agora');
  else warn('iniciar.bat não contém texto exato da opção [1]');
  for (const bad of ['Activate.ps1', 'Set-ExecutionPolicy']) {
    if (!bat.includes(bad)) ok(`iniciar.bat sem legado: ${bad}`);
    else err(`iniciar.bat contém legado: ${bad}`);
  }
}

console.log('================================================================');
console.log(' Noelle V19.8.6 - diagnóstico Overlay Launcher Killer');
console.log('================================================================');

nodeCheck('src/renderer/noelle_overlay_killer_v19_8_6.js');
nodeCheck('scripts/repair_v19_8_6_overlay_launcher_killer_2026.cjs');
nodeCheck('scripts/diagnostico_v19_8_6_overlay_launcher_killer_2026.cjs');
nodeCheck('preload.js');

contains('src/controls.html', './renderer/noelle_overlay_killer_v19_8_6.js', 'runtime Overlay Killer V19.8.6');
contains('src/controls.html', './styles/noelle_overlay_killer_v19_8_6.css', 'CSS Overlay Killer V19.8.6');
contains('src/renderer/noelle_overlay_killer_v19_8_6.js', 'MutationObserver', 'guard por MutationObserver');
contains('src/renderer/noelle_overlay_killer_v19_8_6.js', 'killLegacyFloatingLaunchers', 'remoção de launchers flutuantes');
contains('src/renderer/noelle_overlay_killer_v19_8_6.js', 'Fechar Avatar', 'botão seguro Fechar Avatar');
contains('src/renderer/noelle_overlay_killer_v19_8_6.js', "ev.key === 'Escape'", 'atalho ESC para fechar Avatar');

notContains('preload.js', 'noelle-v19-5-avatar-panel-script');
notContains('preload.js', 'noelle-v19-3-complete-runtime-script');
notContains('preload.js', 'avatar_v19_5_panel_bootstrap.js');
notContains('preload.js', 'noelle_v19_3_complete_ui_md.js');
notContains('preload.js', 'document.createElement("script")');
notContains('preload.js', 'appendChild(script)');
notContains('src/controls.html', 'avatar_v19_5_panel_bootstrap.js');
notContains('src/controls.html', 'noelle_v19_3_complete_ui_md.js');
notContains('src/controls.html', 'noelle_avatar_resize_guard_v19_8_3.js');
notContains('src/controls.html', 'noelle_avatar_route_guard_v19_8_4.js');

checkManifest();
checkPackage();
checkIniciar();

if (errors) {
  console.log(`\n[ERRO] Diagnóstico V19.8.6 encontrou ${errors} problema(s).`);
  process.exit(1);
}
if (warnings) console.log(`\n[AVISO] Diagnóstico V19.8.6 aprovado com ${warnings} aviso(s).`);
else console.log('\n[OK] Diagnóstico V19.8.6 aprovado.');
