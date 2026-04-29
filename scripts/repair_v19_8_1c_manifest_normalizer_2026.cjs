#!/usr/bin/env node
/*
  Noelle Companion 2026 - V19.8.1c Manifest Normalizer
  Objetivo: garantir que src/assets/avatar_manifest.json seja SEMPRE um array JSON valido
  e que contenha caminhos existentes para VRM/GLB reais.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_1c_manifest_normalizer_${STAMP}`);
const MANIFEST = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');

const EXCLUDE_DIRS = new Set([
  '.git', '.github', 'node_modules', 'backups', 'backup', 'release', 'dist', 'out',
  'build', '.venv', 'venv', '__pycache__', '.cache', '.next', '.vite', '.idea', '.vscode'
]);

const STRONG_AVATAR_DIR_WORDS = [
  'avatar', 'avatars', 'vrm', 'personagem', 'personagens', 'character', 'characters', 'models', 'modelos'
];

const STRONG_AVATAR_FILE_WORDS = [
  'avatar', 'vrm', 'noelle', 'yoru', 'yuro', 'char', 'character', 'personagem', 'model'
];

function logOk(msg) { console.log(`[OK] ${msg}`); }
function logInfo(msg) { console.log(`[INFO] ${msg}`); }
function logWarn(msg) { console.log(`[AVISO] ${msg}`); }
function logErr(msg) { console.error(`[ERRO] ${msg}`); }

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
  if (!exists(file)) return;
  const rel = path.relative(ROOT, file);
  const dest = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  logOk(`Backup: ${rel} -> ${path.relative(ROOT, dest)}`);
}

function normalizeSlashes(s) {
  return String(s || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function cleanNameFromFile(file) {
  const base = path.basename(file, path.extname(file));
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function makeId(file) {
  return path.basename(file, path.extname(file))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'avatar';
}

function projectRel(abs) {
  return normalizeSlashes(path.relative(ROOT, abs));
}

function srcRel(abs) {
  const rel = projectRel(abs);
  if (rel.startsWith('src/')) return rel.slice(4);
  return rel;
}

function candidatePathsFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const values = [];
  for (const key of ['rel', 'url', 'path', 'file', 'src', 'href']) {
    if (typeof entry[key] === 'string' && entry[key].trim()) values.push(entry[key].trim());
  }
  return values;
}

function resolveCandidatePath(p) {
  if (!p || typeof p !== 'string') return null;
  let s = p.trim();
  if (!s) return null;
  s = s.replace(/^file:\/\//i, '');
  s = normalizeSlashes(s);
  s = decodeURIComponent(s);
  // Remove query/hash from URLs used by renderer.
  s = s.split('?')[0].split('#')[0];
  if (/^[a-zA-Z]:\//.test(s) || s.startsWith('/')) {
    return path.normalize(s);
  }
  const attempts = [
    path.join(ROOT, s),
    path.join(ROOT, 'src', s),
    path.join(ROOT, 'public', s),
  ];
  for (const a of attempts) {
    if (exists(a)) return a;
  }
  // Return best effort path for later existence check.
  return attempts[0];
}

function collectFromExistingManifest() {
  if (!exists(MANIFEST)) return [];
  try {
    const raw = readText(MANIFEST).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    let arr = [];
    if (Array.isArray(parsed)) arr = parsed;
    else if (Array.isArray(parsed.avatars)) arr = parsed.avatars;
    else if (Array.isArray(parsed.items)) arr = parsed.items;
    else if (Array.isArray(parsed.models)) arr = parsed.models;
    else if (parsed && typeof parsed === 'object') {
      // Sometimes manifests are maps: { yoru: { rel: ... } }
      arr = Object.entries(parsed).map(([key, value]) => {
        if (value && typeof value === 'object') return { id: key, ...value };
        if (typeof value === 'string') return { id: key, rel: value };
        return null;
      }).filter(Boolean);
    }
    const files = [];
    for (const entry of arr) {
      for (const p of candidatePathsFromEntry(entry)) {
        const abs = resolveCandidatePath(p);
        if (abs && exists(abs) && /\.(vrm|glb)$/i.test(abs)) files.push(abs);
      }
    }
    return files;
  } catch (err) {
    logWarn(`Manifest atual não pôde ser lido como JSON: ${err.message}`);
    return [];
  }
}

function isProbablyAvatarGlb(abs) {
  const rel = projectRel(abs).toLowerCase();
  const name = path.basename(abs).toLowerCase();
  const dirWords = STRONG_AVATAR_DIR_WORDS.some((w) => rel.includes(`/${w}/`) || rel.includes(`\\${w}\\`) || rel.includes(w + '/'));
  const fileWords = STRONG_AVATAR_FILE_WORDS.some((w) => name.includes(w));
  // For .vrm always accept. For .glb be conservative to avoid inventory items/scenery.
  if (/\.vrm$/i.test(abs)) return true;
  if (!/\.glb$/i.test(abs)) return false;
  return dirWords || fileWords;
}

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      walk(abs, out);
    } else if (ent.isFile()) {
      if (/\.(vrm|glb)$/i.test(ent.name) && isProbablyAvatarGlb(abs)) out.push(abs);
    }
  }
}

function collectByScanning() {
  const roots = [
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
    path.join(ROOT, 'models'),
    ROOT,
  ];
  const found = [];
  const seenRoot = new Set();
  for (const r of roots) {
    const real = path.normalize(r);
    if (!exists(real)) continue;
    const key = real.toLowerCase();
    if (seenRoot.has(key)) continue;
    seenRoot.add(key);
    walk(real, found);
  }
  return found;
}

function uniqFiles(files) {
  const seen = new Set();
  const out = [];
  for (const f of files) {
    const abs = path.resolve(f);
    const key = process.platform === 'win32' ? abs.toLowerCase() : abs;
    if (seen.has(key)) continue;
    if (!exists(abs)) continue;
    seen.add(key);
    out.push(abs);
  }
  out.sort((a, b) => projectRel(a).localeCompare(projectRel(b), 'pt-BR'));
  return out;
}

function buildManifest(files) {
  const idCounts = new Map();
  return files.map((abs) => {
    const ext = path.extname(abs).slice(1).toLowerCase();
    const baseId = makeId(abs);
    const n = idCounts.get(baseId) || 0;
    idCounts.set(baseId, n + 1);
    const id = n ? `${baseId}-${n + 1}` : baseId;
    const pRel = projectRel(abs);
    const sRel = srcRel(abs);
    return {
      id,
      name: cleanNameFromFile(abs),
      type: ext,
      rel: sRel,
      url: sRel,
      path: pRel,
      source: 'v19.8.1c-scan'
    };
  });
}

function updatePackageScripts() {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!exists(pkgPath)) return;
  let pkg;
  try { pkg = JSON.parse(readText(pkgPath)); } catch (err) {
    logWarn(`package.json inválido, pulando atualização: ${err.message}`);
    return;
  }
  backupFile(pkgPath);
  pkg.version = '19.8.1c-manifest-normalizer-2026';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.1c-manifest'] = 'node scripts/repair_v19_8_1c_manifest_normalizer_2026.cjs';
  pkg.scripts['diagnostico:v19.8.1c-manifest'] = 'node scripts/diagnostico_v19_8_1c_manifest_normalizer_2026.cjs';
  writeText(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  logOk('package.json atualizado para V19.8.1c.');
}

function updateMemory() {
  const mem = path.join(ROOT, 'MEMORIA_GPT_NOELLE.md');
  if (!exists(mem)) return;
  const marker = 'V19.8.1c Manifest Normalizer';
  let text = readText(mem);
  if (text.includes(marker)) {
    logOk('MEMORIA_GPT_NOELLE.md já contém V19.8.1c.');
    return;
  }
  backupFile(mem);
  text += `\n\n## ${marker} - 2026\n- O avatar_manifest.json deve ser sempre uma lista/array JSON.\n- Cada entrada deve apontar para arquivo VRM/GLB existente.\n- A opção [1] do iniciar.bat continua apenas iniciando o programa, sem aplicar patch automaticamente.\n`;
  writeText(mem, text);
  logOk('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.1c.');
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1c Manifest Normalizer 2026 - reparo controlado');
  console.log('================================================================');

  ensureDir(BACKUP_DIR);
  backupFile(MANIFEST);

  const fromManifest = collectFromExistingManifest();
  const fromScan = collectByScanning();
  const files = uniqFiles([...fromManifest, ...fromScan]);

  logInfo(`Arquivos VRM/GLB candidatos encontrados: ${files.length}`);
  for (const f of files.slice(0, 40)) {
    console.log(`  - ${projectRel(f)}`);
  }
  if (files.length > 40) console.log(`  ... e mais ${files.length - 40}`);

  const manifest = buildManifest(files);
  writeText(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  logOk(`avatar_manifest.json regravado como array JSON: ${path.relative(ROOT, MANIFEST)}`);
  logOk(`Entradas no manifest: ${manifest.length}`);

  updatePackageScripts();
  updateMemory();

  if (manifest.length === 0) {
    logWarn('Nenhum VRM/GLB foi encontrado. Confira se os arquivos estão em src/assets/avatars ou assets/avatars.');
    process.exitCode = 2;
  } else {
    logOk(`Reparação V19.8.1c concluída. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
  }
}

main();
