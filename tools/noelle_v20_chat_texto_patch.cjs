#!/usr/bin/env node
/*
  Noelle v20 - Chat Texto Patch
  Safe installer: copies templates into target folder and backs up overwritten files.
*/
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
function hasArg(name) { return args.includes(name); }

const packRoot = path.resolve(__dirname, '..');
const templateRoot = path.join(packRoot, 'templates');
const cwd = process.cwd();
const target = path.resolve(argValue('--target', path.join(cwd, 'noelle_app')));
const noBackup = hasArg('--no-backup');
const skipExisting = hasArg('--skip-existing');

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
const backupRoot = path.join(cwd, 'backups', `v20_chat_texto_${stamp()}`);

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copyFileSafe(src, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    if (skipExisting) {
      console.log(`[SKIP] Ja existe: ${path.relative(cwd, dest)}`);
      return;
    }
    if (!noBackup) {
      const rel = path.relative(target, dest);
      const backupDest = path.join(backupRoot, rel);
      ensureDir(path.dirname(backupDest));
      fs.copyFileSync(dest, backupDest);
      console.log(`[BACKUP] ${path.relative(cwd, dest)} -> ${path.relative(cwd, backupDest)}`);
    }
  }
  fs.copyFileSync(src, dest);
  console.log(`[OK] ${path.relative(cwd, dest)}`);
}
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

console.log('================================================================');
console.log(' Noelle v20 - Chat Texto + Diagnostico Ollama');
console.log('================================================================');
console.log(`[INFO] Pack:   ${packRoot}`);
console.log(`[INFO] Alvo:   ${target}`);
console.log(`[INFO] Backup: ${noBackup ? 'desativado' : backupRoot}`);
console.log('================================================================');

if (!fs.existsSync(templateRoot)) {
  console.error('[ERRO] templates/ nao encontrado. Extraia o pack completo.');
  process.exit(1);
}

ensureDir(target);
for (const src of walk(templateRoot)) {
  const rel = path.relative(templateRoot, src);
  const dest = path.join(target, rel);
  copyFileSafe(src, dest);
}

console.log('================================================================');
console.log('[OK] Estrutura v20 chat texto aplicada.');
if (!noBackup) console.log(`[OK] Backup salvo em: ${backupRoot}`);
console.log('');
console.log('Agora rode:');
console.log(`  cd "${path.relative(cwd, target) || '.'}"`);
console.log('  iniciar.bat');
console.log('');
console.log('Diagnostico manual:');
console.log('  npm run diagnostico:v20');
console.log('================================================================');
