#!/usr/bin/env node
'use strict';

/**
 * Noelle V19.8.1b - diagnóstico Manifest Robusto 2026
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const MANIFEST_PATH = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');

let failed = false;

function ok(message) { console.log(`[OK] ${message}`); }
function warn(message) { console.log(`[AVISO] ${message}`); }
function err(message) { console.error(`[ERRO] ${message}`); failed = true; }
function exists(file) { try { return fs.existsSync(file); } catch (_) { return false; } }
function read(file) { return fs.readFileSync(file, 'utf8'); }

function nodeCheck(file) {
  if (!exists(file)) {
    err(`Arquivo ausente: ${file}`);
    return;
  }
  try {
    childProcess.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok(`node --check ${path.relative(ROOT, file)}`);
  } catch (e) {
    err(`node --check falhou: ${path.relative(ROOT, file)}`);
    if (e.stderr) process.stderr.write(e.stderr);
  }
}

function assertContains(text, token, label) {
  if (text.includes(token)) ok(`${label} contém: ${token}`);
  else err(`${label} não contém: ${token}`);
}

function assertNotContains(text, token, label) {
  if (!text.includes(token)) ok(`${label} sem legado: ${token}`);
  else err(`${label} ainda contém legado: ${token}`);
}

function loadJsonArray(file) {
  if (!exists(file)) {
    err('avatar_manifest.json não existe em src/assets/avatar_manifest.json');
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(read(file));
  } catch (e) {
    err(`avatar_manifest.json inválido: ${e.message}`);
    return [];
  }
  if (!Array.isArray(parsed)) {
    err('avatar_manifest.json existe, mas não é uma lista/array JSON');
    return [];
  }
  if (parsed.length === 0) {
    err('avatar_manifest.json existe, mas está vazio');
    return [];
  }
  ok(`avatar_manifest.json é lista com ${parsed.length} avatar(es)`);
  return parsed;
}

function resolveModelPath(item) {
  const candidates = [];
  for (const key of ['rootRel', 'rel', 'src', 'file', 'path']) {
    if (typeof item[key] === 'string' && item[key].trim()) {
      const value = item[key].replace(/\\/g, '/');
      candidates.push(path.join(ROOT, value));
      candidates.push(path.join(SRC_DIR, value));
    }
  }
  return candidates.find((candidate) => exists(candidate)) || null;
}

function checkManifestItems(items) {
  const ids = new Set();
  let validModels = 0;
  let existingModels = 0;

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      err(`manifest[${index}] não é objeto`);
      return;
    }

    if (!item.id || typeof item.id !== 'string') err(`manifest[${index}] sem id string`);
    else if (ids.has(item.id)) err(`id duplicado no manifest: ${item.id}`);
    else ids.add(item.id);

    if (!item.name || typeof item.name !== 'string') err(`manifest[${index}] sem name string`);

    const rel = item.rel || item.src || item.file || item.path || '';
    if (!rel || typeof rel !== 'string') {
      err(`manifest[${index}] sem caminho rel/src/file/path`);
      return;
    }

    const ext = path.extname(rel).toLowerCase();
    if (ext !== '.vrm' && ext !== '.glb') {
      err(`manifest[${index}] caminho não é VRM/GLB: ${rel}`);
      return;
    }
    validModels += 1;

    const modelPath = resolveModelPath(item);
    if (!modelPath) {
      err(`manifest[${index}] aponta para arquivo inexistente: ${rel}`);
      return;
    }
    existingModels += 1;
  });

  if (validModels > 0) ok(`Manifest contém ${validModels} modelo(s) VRM/GLB`);
  else err('Manifest não contém nenhum VRM/GLB válido');

  if (existingModels > 0) ok(`Manifest aponta para ${existingModels} arquivo(s) existente(s)`);
  else err('Nenhum arquivo do manifest existe no disco');
}

function checkPreloadStillClean() {
  const preload = path.join(ROOT, 'preload.js');
  if (!exists(preload)) {
    err('preload.js não encontrado');
    return;
  }
  const text = read(preload);
  nodeCheck(preload);
  assertContains(text, 'contextBridge.exposeInMainWorld("noelleAPI"', 'preload.js');
  assertContains(text, 'contextBridge.exposeInMainWorld("desktopWidget"', 'preload.js');
  assertContains(text, 'contextBridge.exposeInMainWorld("noelleRoom"', 'preload.js');
  assertNotContains(text, 'noelle-v19-5-avatar-panel-script', 'preload.js');
  assertNotContains(text, 'noelle-v19-3-complete-runtime-script', 'preload.js');
  assertNotContains(text, 'avatar_v19_5_panel_bootstrap.js', 'preload.js');
  assertNotContains(text, 'noelle_v19_3_complete_ui_md.js', 'preload.js');
  assertNotContains(text, 'document.createElement("script")', 'preload.js');
  assertNotContains(text, 'appendChild(script)', 'preload.js');
}

function checkIniciar() {
  const file = path.join(ROOT, 'iniciar.bat');
  if (!exists(file)) {
    err('iniciar.bat não encontrado');
    return;
  }
  const text = read(file);
  assertNotContains(text, 'Activate.ps1', 'iniciar.bat');
  assertNotContains(text, 'Set-ExecutionPolicy', 'iniciar.bat');
  assertContains(text, '[1] Iniciar programa agora', 'iniciar.bat');
}

function checkPackage() {
  const file = path.join(ROOT, 'package.json');
  if (!exists(file)) {
    warn('package.json não encontrado');
    return;
  }
  let pkg;
  try { pkg = JSON.parse(read(file)); } catch (e) { err(`package.json inválido: ${e.message}`); return; }
  if (String(pkg.version || '').includes('19.8.1b')) ok(`package.json version: ${pkg.version}`);
  else warn(`package.json version não é V19.8.1b: ${pkg.version}`);
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1b - diagnóstico Manifest Robusto');
  console.log('================================================================');

  nodeCheck(path.join(ROOT, 'scripts', 'repair_v19_8_1b_manifest_robusto_2026.cjs'));
  nodeCheck(path.join(ROOT, 'scripts', 'diagnostico_v19_8_1b_manifest_robusto_2026.cjs'));
  nodeCheck(path.join(ROOT, 'scripts', 'status_v19_8_1b_2026.cjs'));

  checkPackage();
  checkPreloadStillClean();
  checkIniciar();

  const items = loadJsonArray(MANIFEST_PATH);
  checkManifestItems(items);

  if (failed) {
    console.error('\n[ERRO] Diagnóstico V19.8.1b encontrou problemas.');
    process.exit(1);
  }

  console.log('\n[OK] Diagnóstico V19.8.1b aprovado.');
}

main();
