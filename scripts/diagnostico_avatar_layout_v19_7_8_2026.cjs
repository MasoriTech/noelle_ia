#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const checks = [
  'preload.js',
  'src/avatar_carousel_preview_v19_7_8.html',
  'src/renderer/noelle_avatar_tab_v19_7_8_runtime.js',
  'src/renderer/avatar_carousel_preview_v19_7_8_app.js',
  'scripts/build_avatar_tab_v19_7_8_2026.cjs',
  'scripts/fix_avatar_layout_v19_7_8_2026.cjs'
];
let failed = false;
function ok(msg) { console.log('[OK] ' + msg); }
function warn(msg) { console.log('[AVISO] ' + msg); }
function err(msg) { console.error('[ERRO] ' + msg); failed = true; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

for (const rel of checks) {
  if (exists(rel)) ok('Encontrado: ' + rel);
  else err('Ausente: ' + rel);
}

const preload = exists('preload.js') ? read('preload.js') : '';
if (preload.includes('noelle_avatar_tab_v19_7_8_runtime.js')) ok('preload injeta Avatar V19.7.8.');
else err('preload não injeta Avatar V19.7.8.');
if (!preload.includes('./renderer/avatar_v19_5_panel_bootstrap.js')) ok('preload não injeta painel técnico V19.5 diretamente.');
else err('preload ainda injeta painel técnico V19.5.');

const legacy = exists('src/renderer/avatar_v19_5_panel_bootstrap.js') ? read('src/renderer/avatar_v19_5_panel_bootstrap.js') : '';
if (legacy.includes('noelle_avatar_tab_v19_7_8_runtime.js')) ok('bootstrap antigo redireciona para runtime limpo.');
else warn('bootstrap antigo não redireciona; pode não existir ou estar intacto.');

const manifestPath = path.join(SRC, 'assets', 'avatar_manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const count = Array.isArray(data.avatars) ? data.avatars.length : 0;
    if (count > 0) ok('Avatares no manifest: ' + count);
    else warn('Manifest existe, mas não contém avatares.');
  } catch (e) { err('avatar_manifest.json inválido: ' + e.message); }
} else err('avatar_manifest.json ausente.');

const jsToCheck = [
  'src/renderer/noelle_avatar_tab_v19_7_8_runtime.js',
  'src/renderer/avatar_carousel_preview_v19_7_8_app.js',
  'scripts/build_avatar_tab_v19_7_8_2026.cjs',
  'scripts/fix_avatar_layout_v19_7_8_2026.cjs',
  'scripts/diagnostico_avatar_layout_v19_7_8_2026.cjs'
];
for (const rel of jsToCheck) {
  if (!exists(rel)) continue;
  const result = cp.spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status === 0) ok('node --check ' + rel);
  else err('node --check falhou: ' + rel + '\n' + (result.stderr || result.stdout));
}

const bundle = path.join(SRC, 'renderer_dist', 'avatar_carousel_preview_v19_7_8.bundle.js');
if (fs.existsSync(bundle)) ok('Bundle existe: src/renderer_dist/avatar_carousel_preview_v19_7_8.bundle.js');
else warn('Bundle ainda não existe. Rode: npm run build:avatar-tab-v19.7.8');

if (failed) {
  console.error('[ERRO] Diagnóstico V19.7.8 encontrou problemas.');
  process.exit(1);
}
ok('Diagnóstico V19.7.8 aprovado.');
