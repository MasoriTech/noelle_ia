#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function exists(p) { return fs.existsSync(path.join(root, p)); }
function readJson(p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); }
function listBats() { return fs.readdirSync(root).filter((f) => f.toLowerCase().endsWith('.bat')); }
console.log(`Pasta: ${root}`);
if (exists('package.json')) {
  try {
    const pkg = readJson('package.json');
    console.log(`Package: ${pkg.name || '(sem nome)'}`);
    console.log(`Version: ${pkg.version || '(sem versao)'}`);
    console.log(`Scripts V19.8: ${Object.keys(pkg.scripts || {}).filter((s) => s.includes('v19.8')).join(', ') || '(nenhum)'}`);
  } catch (e) {
    console.log(`package.json invalido: ${e.message}`);
  }
} else {
  console.log('package.json: nao encontrado');
}
console.log(`BATs na raiz: ${listBats().join(', ') || '(nenhum)'}`);
if (exists('src/assets/avatar_manifest.json')) {
  try {
    const m = readJson('src/assets/avatar_manifest.json');
    console.log(`Avatar manifest: ${Array.isArray(m) ? m.length : '?'} avatar(es)`);
  } catch (e) {
    console.log(`Avatar manifest: invalido (${e.message})`);
  }
} else {
  console.log('Avatar manifest: nao encontrado');
}
console.log(`preload.js: ${exists('preload.js') ? 'encontrado' : 'nao encontrado'}`);
console.log(`main.js: ${exists('main.js') ? 'encontrado' : 'nao encontrado'}`);
console.log('Fase atual recomendada: V19.8.0 Base Segura. Proxima fase: V19.8.1 Preload Limpo.');
