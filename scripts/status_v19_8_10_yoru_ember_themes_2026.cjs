#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function line(label, value) { console.log(`${label.padEnd(32)} ${value}`); }

console.log('================================================================');
console.log(' Noelle/Yoru V19.8.10 - Status Temas Yoru Ember');
console.log('================================================================');

let version = '(sem package.json)';
try { if (exists('package.json')) version = JSON.parse(read('package.json')).version || '(sem version)'; } catch (_) { version = '(package.json inválido)'; }
line('Versão package.json:', version);
line('Tema principal:', 'Yoru Ember / yoru-ember');
line('CSS temas:', exists('src/styles/noelle_themes_v19_8_10.css') ? 'OK' : 'AUSENTE');
line('Runtime temas:', exists('src/renderer/noelle_theme_manager_v19_8_10.js') ? 'OK' : 'AUSENTE');
line('Config tema:', exists('data/noelle_theme_settings.json') ? 'OK' : 'AUSENTE');
line('controls.html:', exists('src/controls.html') ? 'OK' : 'AUSENTE');
line('preload.js:', exists('preload.js') ? 'OK' : 'AUSENTE');
line('iniciar.bat:', exists('iniciar.bat') ? 'OK' : 'AUSENTE');

if (exists('src/controls.html')) {
  const html = read('src/controls.html');
  line('Tema injetado no HTML:', html.includes('noelle_theme_manager_v19_8_10.js') && html.includes('noelle_themes_v19_8_10.css') ? 'SIM' : 'NÃO');
}

if (exists('data/noelle_theme_settings.json')) {
  try {
    const settings = JSON.parse(read('data/noelle_theme_settings.json'));
    line('Default theme:', settings.defaultTheme || '(vazio)');
    line('Temas registrados:', Array.isArray(settings.themes) ? String(settings.themes.length) : '(inválido)');
  } catch (_) {
    line('Config tema JSON:', 'INVÁLIDO');
  }
}

console.log('================================================================');
console.log(' Dica: rode `npm run diagnostico:v19.8.10-themes` ou use o menu do iniciar.bat.');
console.log('================================================================');
