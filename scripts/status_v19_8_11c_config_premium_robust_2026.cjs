#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const VERSION = '19.8.11c-config-premium-robust-2026';
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
console.log('================================================================');
console.log(' Status V19.8.11c - Configurações Premium Robusta');
console.log('================================================================');
console.log('[INFO] versão alvo:', VERSION);
console.log('[INFO] runtime:', exists('src/renderer/noelle_config_premium_v19_8_11c.js') ? 'presente' : 'ausente');
console.log('[INFO] CSS:', exists('src/styles/noelle_config_premium_v19_8_11c.css') ? 'presente' : 'ausente');
console.log('[INFO] controls.html:', exists('src/controls.html') ? 'presente' : 'ausente');
console.log('[INFO] iniciar.bat:', exists('iniciar.bat') ? 'presente' : 'ausente');
if (exists('package.json')) {
  try {
    const pkg = JSON.parse(read('package.json'));
    console.log('[INFO] package.json version:', pkg.version || '(sem version)');
  } catch {
    console.log('[AVISO] package.json inválido');
  }
}
