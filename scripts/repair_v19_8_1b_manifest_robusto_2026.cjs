#!/usr/bin/env node
'use strict';

/**
 * Noelle V19.8.1b - Manifest Robusto 2026
 *
 * Objetivo:
 * - Corrigir avatar_manifest.json vazio, inválido ou no formato errado.
 * - Gerar uma LISTA JSON estável com VRM/GLB reais do projeto.
 * - Não mexer em Chat, Room, Widget, VRMA, expressions PNG ou items GLB.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const ASSETS_DIR = path.join(SRC_DIR, 'assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'avatar_manifest.json');
const NOW_SAFE = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_ROOT = path.join(ROOT, 'backups', `v19_8_1b_manifest_robusto_2026-${NOW_SAFE}`);

const MODEL_EXTENSIONS = new Set(['.vrm', '.glb']);
const SKIP_DIRS = new Set([
  '.git', '.github', 'node_modules', 'release', 'dist', 'out', 'build',
  'backups', '.venv', 'venv', '__pycache__', '.cache', '.next', '.vite'
]);

function logOk(message) { console.log(`[OK] ${message}`); }
function logInfo(message) { console.log(`[INFO] ${message}`); }
function logWarn(message) { console.log(`[AVISO] ${message}`); }
function fail(message) { console.error(`[ERRO] ${message}`); process.exitCode = 1; }

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(file) {
  try { return fs.existsSync(file); } catch (_) { return false; }
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, 'utf8');
}

function backupFile(file) {
  if (!exists(file)) return null;
  const rel = path.relative(ROOT, file);
  const dest = path.join(BACKUP_ROOT, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  logOk(`Backup: ${rel} -> ${path.relative(ROOT, dest)}`);
  return dest;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function slugify(value) {
  return String(value || 'avatar')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'avatar';
}

function prettyName(abs) {
  const base = path.basename(abs, path.extname(abs));
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || 'Avatar';
}

function shortHash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 8);
}

function safeStat(file) {
  try { return fs.statSync(file); } catch (_) { return null; }
}

function walk(dir, out, depth = 0, maxDepth = 8) {
  if (depth > maxDepth || !exists(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs, out, depth + 1, maxDepth);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (MODEL_EXTENSIONS.has(ext)) out.push(abs);
  }
}

function candidateRoots() {
  const candidates = [
    path.join(ROOT, 'src', 'assets', 'avatars'),
    path.join(ROOT, 'src', 'assets', 'vrm'),
    path.join(ROOT, 'src', 'assets', 'models'),
    path.join(ROOT, 'src', 'assets'),
    path.join(ROOT, 'assets', 'avatars'),
    path.join(ROOT, 'assets', 'vrm'),
    path.join(ROOT, 'assets', 'models'),
    path.join(ROOT, 'assets'),
    path.join(ROOT, 'public', 'assets'),
    path.join(ROOT, 'resources'),
    path.join(ROOT, 'models')
  ];
  return [...new Set(candidates)].filter((dir) => exists(dir));
}

function rendererRelFromSrc(abs) {
  // A janela principal normalmente roda a partir de src/controls.html.
  // Portanto, arquivos dentro de src/assets devem virar assets/...
  if (abs.startsWith(SRC_DIR + path.sep)) {
    return toPosix(path.relative(SRC_DIR, abs));
  }
  // Se o avatar estiver fora de src/, ainda tentamos um caminho relativo a src/.
  return toPosix(path.relative(SRC_DIR, abs));
}

function collectAvatarFiles() {
  const seen = new Set();
  const files = [];

  for (const dir of candidateRoots()) {
    walk(dir, files, 0, 8);
  }

  // Fallback: se as pastas convencionais não acharam nada, varre o projeto com exclusões pesadas.
  if (files.length === 0) {
    logWarn('Nenhum avatar encontrado nas pastas convencionais; varrendo projeto com exclusões seguras.');
    walk(ROOT, files, 0, 8);
  }

  return files.filter((abs) => {
    const key = path.resolve(abs).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function priority(item) {
  const n = `${item.name} ${item.rootRel}`.toLowerCase();
  if (n.includes('noelle')) return 0;
  if (n.includes('yoru')) return 1;
  return 2;
}

function buildManifest() {
  const files = collectAvatarFiles();
  const items = files.map((abs) => {
    const ext = path.extname(abs).toLowerCase().replace('.', '');
    const rel = rendererRelFromSrc(abs);
    const rootRel = toPosix(path.relative(ROOT, abs));
    const stat = safeStat(abs);
    const name = prettyName(abs);
    const id = `${slugify(name)}-${shortHash(rootRel)}`;
    return {
      id,
      name,
      type: ext,
      rel,
      src: rel,
      file: rel,
      rootRel,
      sizeBytes: stat ? stat.size : 0,
      mtimeMs: stat ? Math.round(stat.mtimeMs) : 0
    };
  });

  items.sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  return items;
}

function writeManifest(items) {
  ensureDir(ASSETS_DIR);
  backupFile(MANIFEST_PATH);
  writeText(MANIFEST_PATH, JSON.stringify(items, null, 2) + '\n');
  logOk(`avatar_manifest.json gerado: ${items.length} avatar(es).`);
}

function updatePackageJson() {
  const file = path.join(ROOT, 'package.json');
  if (!exists(file)) {
    logWarn('package.json não encontrado; pulando atualização de scripts.');
    return;
  }
  backupFile(file);
  const pkg = JSON.parse(readText(file));
  pkg.version = '19.8.1b-manifest-robusto-2026';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.1b-manifest'] = 'node scripts/repair_v19_8_1b_manifest_robusto_2026.cjs';
  pkg.scripts['diagnostico:v19.8.1b-manifest'] = 'node scripts/diagnostico_v19_8_1b_manifest_robusto_2026.cjs';
  pkg.scripts['status:v19.8.1b'] = 'node scripts/status_v19_8_1b_2026.cjs';
  writeText(file, JSON.stringify(pkg, null, 2) + '\n');
  logOk('package.json atualizado para V19.8.1b.');
}

function updateMemory() {
  const file = path.join(ROOT, 'MEMORIA_GPT_NOELLE.md');
  if (!exists(file)) {
    logWarn('MEMORIA_GPT_NOELLE.md não encontrado; pulando nota de memória.');
    return;
  }
  const marker = 'V19.8.1b Manifest Robusto 2026';
  let text = readText(file);
  if (text.includes(marker)) {
    logOk('MEMORIA_GPT_NOELLE.md já contém nota V19.8.1b.');
    return;
  }
  backupFile(file);
  text += `\n\n## ${marker}\n- Fase complementar da V19.8.1: corrige avatar_manifest.json vazio, inválido ou fora do formato de lista.\n- O manifest oficial fica em src/assets/avatar_manifest.json e deve ser um array JSON de avatares VRM/GLB reais.\n- Preserva Chat IA, Room, Widget, Preview, VRMA, expressions PNG, items GLB e preload limpo.\n- iniciar.bat permanece único; opção [1] apenas inicia o programa, sem aplicar patch automático.\n`;
  writeText(file, text);
  logOk('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.1b.');
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1b Manifest Robusto 2026 - reparo controlado');
  console.log('================================================================');

  ensureDir(BACKUP_ROOT);

  const items = buildManifest();
  if (items.length === 0) {
    fail('Nenhum arquivo .vrm/.glb encontrado. Verifique src/assets, src/assets/avatars ou assets.');
    return;
  }

  writeManifest(items);
  updatePackageJson();
  updateMemory();

  logInfo(`Backup: ${path.relative(ROOT, BACKUP_ROOT)}`);
  logOk('Reparação V19.8.1b concluída.');
  logInfo('Rode: node scripts\\diagnostico_v19_8_1b_manifest_robusto_2026.cjs');
}

main();
