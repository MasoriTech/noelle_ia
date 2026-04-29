#!/usr/bin/env node
'use strict';

/**
 * Noelle V19.8.1d - Manifest Forte 2026
 * Repara/normaliza src/assets/avatar_manifest.json como ARRAY JSON.
 * Também atualiza package.json para a versão V19.8.1d.
 * Não mexe em preload.js além de verificar que ele existe.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.1d-manifest-forte-2026';
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_1d_manifest_forte_${new Date().toISOString().replace(/[:.]/g, '-')}`);
const PRIMARY_MANIFEST = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.venv', 'venv', 'env', '__pycache__',
  'backups', 'backup', 'release', 'dist', 'build', 'out', '.cache',
  'renderer_dist', 'logs', 'tmp', 'temp'
]);

function log(kind, msg) {
  const prefix = kind === 'ok' ? '[OK]' : kind === 'warn' ? '[AVISO]' : kind === 'err' ? '[ERRO]' : '[INFO]';
  console.log(`${prefix} ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, 'utf8');
}

function backup(file) {
  if (!exists(file)) return;
  const rel = path.relative(ROOT, file);
  const dest = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  log('ok', `Backup: ${rel} -> ${path.relative(ROOT, dest)}`);
}

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function safeId(name) {
  return String(name || 'avatar')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'avatar';
}

function prettyName(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function relForBrowser(absFile) {
  const relRoot = toPosix(path.relative(ROOT, absFile));
  if (relRoot.startsWith('src/')) return relRoot.slice(4);
  return relRoot;
}

function pathForDisk(absFile) {
  return toPosix(path.relative(ROOT, absFile));
}

function isAvatarishGlb(absFile) {
  const rel = toPosix(path.relative(ROOT, absFile)).toLowerCase();
  const base = path.basename(absFile).toLowerCase();
  const avatarWords = [
    'avatar', 'avatars', 'vrm', 'character', 'characters', 'personagem', 'personagens',
    'model', 'models', 'noelle', 'yoru', 'arisa', 'alice', 'hiyori', 'girl', 'bone', 'rig'
  ];
  const objectWords = [
    'room', 'quarto', 'scene', 'cenario', 'cena', 'chair', 'mesa', 'table', 'sofa',
    'bed', 'cama', 'katana', 'iphone', 'phone', 'basketball', 'bola', 'guitar', 'violao',
    'item', 'items', 'prop', 'props', 'furniture', 'assetpack'
  ];
  if (objectWords.some(w => base.includes(w))) return false;
  return avatarWords.some(w => rel.includes(w));
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') {
      if (entry.name === '.git') continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.vrm') out.push(full);
      else if (ext === '.glb' && isAvatarishGlb(full)) out.push(full);
    }
  }
  return out;
}

function resolveEntryPath(entry) {
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

function collectExistingManifestEntries() {
  if (!exists(PRIMARY_MANIFEST)) return [];
  let raw;
  try { raw = readText(PRIMARY_MANIFEST).trim(); } catch { return []; }
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    log('warn', 'Manifest antigo existe, mas não é JSON válido. Ele será substituído.');
    return [];
  }

  let list = [];
  if (Array.isArray(parsed)) list = parsed;
  else if (parsed && Array.isArray(parsed.avatars)) list = parsed.avatars;
  else if (parsed && Array.isArray(parsed.items)) list = parsed.items;
  else {
    log('warn', 'Manifest antigo não é array nem { avatars: [...] }. Ele será substituído.');
    return [];
  }

  const recovered = [];
  for (const entry of list) {
    const abs = resolveEntryPath(entry);
    if (!abs) continue;
    const ext = path.extname(abs).toLowerCase().slice(1);
    if (!['vrm', 'glb'].includes(ext)) continue;
    if (ext === 'glb' && !isAvatarishGlb(abs)) continue;
    recovered.push(makeEntry(abs, 'manifest-antigo'));
  }
  return recovered;
}

function makeEntry(absFile, source) {
  const ext = path.extname(absFile).toLowerCase().slice(1);
  const stat = fs.statSync(absFile);
  const idBase = safeId(path.basename(absFile, path.extname(absFile)));
  return {
    id: idBase,
    name: prettyName(absFile),
    type: ext,
    rel: relForBrowser(absFile),
    path: pathForDisk(absFile),
    source,
    size_bytes: stat.size,
    exists: true
  };
}

function uniqueEntries(entries) {
  const byPath = new Map();
  for (const entry of entries) {
    const key = toPosix(entry.path || entry.rel || entry.id).toLowerCase();
    if (!byPath.has(key)) byPath.set(key, entry);
  }
  const arr = [...byPath.values()];
  const idCount = new Map();
  for (const entry of arr) {
    const base = safeId(entry.id || entry.name);
    const count = (idCount.get(base) || 0) + 1;
    idCount.set(base, count);
    entry.id = count === 1 ? base : `${base}_${count}`;
  }
  return arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR', { sensitivity: 'base' }));
}

function updatePackageJson() {
  const pkgFile = path.join(ROOT, 'package.json');
  if (!exists(pkgFile)) {
    log('warn', 'package.json não encontrado. Pulando atualização de versão.');
    return;
  }
  backup(pkgFile);
  let pkg;
  try { pkg = JSON.parse(readText(pkgFile)); }
  catch (err) {
    log('err', `package.json não é JSON válido: ${err.message}`);
    return;
  }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.1d'] = 'node scripts/repair_v19_8_1d_manifest_forte_2026.cjs';
  pkg.scripts['diagnostico:v19.8.1d'] = 'node scripts/diagnostico_v19_8_1d_manifest_forte_2026.cjs';
  pkg.scripts['manifest:avatar:v19.8.1d'] = 'node scripts/repair_v19_8_1d_manifest_forte_2026.cjs';
  writeText(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  log('ok', `package.json atualizado para ${VERSION}.`);
}

function updateMemoryMd() {
  const mem = path.join(ROOT, 'MEMORIA_GPT_NOELLE.md');
  if (!exists(mem)) return;
  const marker = 'V19.8.1d - Manifest Forte';
  let text = readText(mem);
  if (text.includes(marker)) {
    log('ok', 'MEMORIA_GPT_NOELLE.md já contém nota V19.8.1d.');
    return;
  }
  backup(mem);
  text += `\n\n## ${marker}\n- avatar_manifest.json deve ser sempre uma lista/array JSON.\n- O manifest deve conter entradas VRM/GLB com path/rel válidos no disco.\n- iniciar.bat permanece único; a opção [1] apenas inicia o programa.\n- Esta fase preserva preload limpo e não redesenha a aba Avatar.\n`;
  writeText(mem, text);
  log('ok', 'MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.1d.');
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1d Manifest Forte 2026 - reparo controlado');
  console.log('================================================================');

  ensureDir(BACKUP_DIR);
  ensureDir(path.dirname(PRIMARY_MANIFEST));
  backup(PRIMARY_MANIFEST);

  const recovered = collectExistingManifestEntries();
  if (recovered.length) log('ok', `Entradas recuperadas do manifest antigo: ${recovered.length}`);

  const scannedFiles = uniqueEntries(walk(ROOT).map(abs => makeEntry(abs, 'scan-profundo')));
  log(scannedFiles.length ? 'ok' : 'warn', `Avatares detectados por varredura: ${scannedFiles.length}`);

  const entries = uniqueEntries([...recovered, ...scannedFiles]);
  writeText(PRIMARY_MANIFEST, JSON.stringify(entries, null, 2) + '\n');
  log(entries.length ? 'ok' : 'warn', `avatar_manifest.json regravado como ARRAY com ${entries.length} avatar(es).`);

  updatePackageJson();
  updateMemoryMd();

  console.log('');
  if (!entries.length) {
    log('err', 'Nenhum .vrm/.glb de avatar foi encontrado. Coloque seus .vrm em src/assets/avatars/ ou assets/avatars/ e rode novamente.');
    process.exitCode = 2;
    return;
  }
  log('ok', `Reparação V19.8.1d concluída. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
  log('info', 'Rode: node scripts\\diagnostico_v19_8_1d_manifest_forte_2026.cjs');
}

main();
