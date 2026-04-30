#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const p = (...parts) => path.join(ROOT, ...parts);
const exists = (rel) => fs.existsSync(p(rel));
const read = (rel) => exists(rel) ? fs.readFileSync(p(rel), 'utf8') : '';

console.log('================================================================');
console.log(' Noelle V19.8.6 - status rápido');
console.log('================================================================');

const pkg = (() => {
  try { return JSON.parse(read('package.json') || '{}'); } catch { return {}; }
})();
console.log(`Versão package.json: ${pkg.version || '(não encontrada)'}`);
console.log(`preload.js limpo: ${read('preload.js').includes('avatar_v19_5_panel_bootstrap.js') ? 'NÃO' : 'SIM'}`);
console.log(`Overlay Killer runtime: ${exists('src/renderer/noelle_overlay_killer_v19_8_6.js') ? 'OK' : 'AUSENTE'}`);
console.log(`Overlay Killer CSS: ${exists('src/styles/noelle_overlay_killer_v19_8_6.css') ? 'OK' : 'AUSENTE'}`);
console.log(`controls.html carrega runtime: ${read('src/controls.html').includes('noelle_overlay_killer_v19_8_6.js') ? 'SIM' : 'NÃO'}`);
console.log(`controls.html carrega CSS: ${read('src/controls.html').includes('noelle_overlay_killer_v19_8_6.css') ? 'SIM' : 'NÃO'}`);

try {
  const manifest = JSON.parse(read('src/assets/avatar_manifest.json') || '[]');
  console.log(`avatar_manifest.json: ${Array.isArray(manifest) ? manifest.length + ' entrada(s)' : 'não é array'}`);
} catch (e) {
  console.log(`avatar_manifest.json: inválido (${e.message})`);
}
