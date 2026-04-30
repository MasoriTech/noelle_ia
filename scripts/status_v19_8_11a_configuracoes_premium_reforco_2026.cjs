#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
console.log('================================================================');
console.log(' Status V19.8.11a - Configurações Premium Reforço');
console.log('================================================================');
console.log('[INFO] runtime:', exists('src/renderer/noelle_settings_dashboard_v19_8_11a.js') ? 'presente' : 'ausente');
console.log('[INFO] css:', exists('src/styles/noelle_settings_dashboard_v19_8_11a.css') ? 'presente' : 'ausente');
console.log('[INFO] iniciar.bat:', exists('iniciar.bat') ? 'presente' : 'ausente');
if (exists('package.json')) {
  try { console.log('[INFO] version:', JSON.parse(read('package.json')).version || '(sem version)'); }
  catch { console.log('[AVISO] package.json inválido'); }
}
if (exists('data/noelle_settings_schema_v19_8_11a.json')) {
  console.log('[INFO] schema:', 'data/noelle_settings_schema_v19_8_11a.json');
}
