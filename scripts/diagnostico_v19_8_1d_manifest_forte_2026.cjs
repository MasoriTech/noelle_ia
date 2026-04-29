#!/usr/bin/env node
'use strict';

/**
 * Diagnóstico Noelle V19.8.1d - Manifest Forte
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = process.cwd();
const VERSION = '19.8.1d-manifest-forte-2026';
const MANIFEST = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');
let problems = 0;

function log(kind, msg) {
  const prefix = kind === 'ok' ? '[OK]' : kind === 'warn' ? '[AVISO]' : kind === 'err' ? '[ERRO]' : '[INFO]';
  console.log(`${prefix} ${msg}`);
  if (kind === 'err') problems += 1;
}

function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function readText(p) { return fs.readFileSync(p, 'utf8'); }
function toPosix(p) { return String(p || '').replace(/\\/g, '/'); }

function nodeCheck(rel) {
  const file = path.join(ROOT, rel);
  if (!exists(file)) return log('err', `${rel} não encontrado`);
  try {
    childProcess.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    log('ok', `node --check ${rel}`);
  } catch (err) {
    log('err', `node --check falhou: ${rel}`);
    if (err.stderr) process.stderr.write(String(err.stderr));
  }
}

function checkNoLegacyInFile(rel, needles) {
  const file = path.join(ROOT, rel);
  if (!exists(file)) return log('warn', `${rel} não encontrado`);
  const text = readText(file);
  for (const needle of needles) {
    if (text.includes(needle)) log('err', `${rel} contém legado: ${needle}`);
    else log('ok', `${rel} sem legado: ${needle}`);
  }
}

function resolveEntry(entry) {
  const candidates = [];
  if (entry && typeof entry.path === 'string') candidates.push(path.join(ROOT, entry.path));
  if (entry && typeof entry.file === 'string') candidates.push(path.join(ROOT, entry.file));
  if (entry && typeof entry.rel === 'string') {
    candidates.push(path.join(ROOT, entry.rel));
    candidates.push(path.join(ROOT, 'src', entry.rel));
  }
  if (entry && typeof entry.url === 'string') {
    const clean = entry.url.replace(/^file:\/\//, '').replace(/^\.\//, '');
    candidates.push(path.join(ROOT, clean));
    candidates.push(path.join(ROOT, 'src', clean));
  }
  return candidates.find(exists) || null;
}

function checkManifest() {
  if (!exists(MANIFEST)) return log('err', 'src/assets/avatar_manifest.json não existe');
  let raw = readText(MANIFEST).trim();
  if (!raw) return log('err', 'avatar_manifest.json está vazio');
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { return log('err', `avatar_manifest.json não é JSON válido: ${err.message}`); }
  if (!Array.isArray(parsed)) return log('err', 'avatar_manifest.json existe, mas não é uma lista/array JSON');
  log('ok', `avatar_manifest.json é array JSON com ${parsed.length} entrada(s)`);
  if (!parsed.length) return log('err', 'Manifest não contém nenhum avatar');

  const valid = [];
  const missing = [];
  const invalidType = [];
  for (const entry of parsed) {
    const ext = String(entry.type || path.extname(entry.path || entry.rel || '').slice(1)).toLowerCase();
    if (!['vrm', 'glb'].includes(ext)) {
      invalidType.push(entry.name || entry.id || JSON.stringify(entry));
      continue;
    }
    const abs = resolveEntry(entry);
    if (abs) valid.push(abs);
    else missing.push(entry.name || entry.id || entry.rel || entry.path || JSON.stringify(entry));
  }
  if (invalidType.length) log('warn', `Entradas ignoradas por tipo inválido: ${invalidType.slice(0, 5).join(', ')}${invalidType.length > 5 ? '...' : ''}`);
  if (!valid.length) log('err', 'Nenhum arquivo do manifest existe no disco');
  else log('ok', `Arquivos válidos encontrados no disco: ${valid.length}`);
  if (missing.length) log('warn', `Entradas sem arquivo no disco: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);

  const vrmCount = parsed.filter(e => String(e.type || '').toLowerCase() === 'vrm' || String(e.rel || e.path || '').toLowerCase().endsWith('.vrm')).length;
  const glbCount = parsed.filter(e => String(e.type || '').toLowerCase() === 'glb' || String(e.rel || e.path || '').toLowerCase().endsWith('.glb')).length;
  if (vrmCount + glbCount < 1) log('err', 'Manifest não contém nenhum VRM/GLB válido');
  else log('ok', `Manifest contém VRM/GLB: VRM=${vrmCount}, GLB=${glbCount}`);
}

function checkPackage() {
  const pkgFile = path.join(ROOT, 'package.json');
  if (!exists(pkgFile)) return log('warn', 'package.json não encontrado');
  let pkg;
  try { pkg = JSON.parse(readText(pkgFile)); }
  catch (err) { return log('err', `package.json inválido: ${err.message}`); }
  if (pkg.version !== VERSION) log('warn', `package.json version não é ${VERSION}: ${pkg.version}`);
  else log('ok', `package.json version: ${VERSION}`);
  const scripts = pkg.scripts || {};
  if (scripts['diagnostico:v19.8.1d']) log('ok', 'package.json contém diagnostico:v19.8.1d');
  else log('warn', 'package.json não contém diagnostico:v19.8.1d');
}

function checkIniciar() {
  const bat = path.join(ROOT, 'iniciar.bat');
  if (!exists(bat)) return log('warn', 'iniciar.bat não encontrado');
  const text = readText(bat);
  if (text.includes('Activate.ps1')) log('err', 'iniciar.bat contém legado: Activate.ps1');
  else log('ok', 'iniciar.bat sem legado: Activate.ps1');
  if (text.includes('Set-ExecutionPolicy')) log('err', 'iniciar.bat contém legado: Set-ExecutionPolicy');
  else log('ok', 'iniciar.bat sem legado: Set-ExecutionPolicy');
  if (text.includes('[1] Iniciar programa agora')) log('ok', 'iniciar.bat contém opção [1] Iniciar programa agora');
  else log('warn', 'iniciar.bat pode não conter a opção [1] Iniciar programa agora');
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1d - diagnóstico Manifest Forte');
  console.log('================================================================');
  nodeCheck('scripts/repair_v19_8_1d_manifest_forte_2026.cjs');
  nodeCheck('scripts/diagnostico_v19_8_1d_manifest_forte_2026.cjs');
  nodeCheck('preload.js');
  checkNoLegacyInFile('preload.js', [
    'noelle-v19-5-avatar-panel-script',
    'noelle-v19-3-complete-runtime-script',
    'avatar_v19_5_panel_bootstrap.js',
    'noelle_v19_3_complete_ui_md.js',
    'document.createElement("script")',
    'appendChild(script)',
    'NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN',
    'NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN'
  ]);
  checkPackage();
  checkIniciar();
  checkManifest();
  console.log('');
  if (problems) {
    log('err', `Diagnóstico V19.8.1d encontrou ${problems} problema(s).`);
    process.exit(1);
  }
  log('ok', 'Diagnóstico V19.8.1d aprovado.');
}

main();
