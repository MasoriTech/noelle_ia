#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel),'utf8'); }
console.log('================================================================');
console.log(' Status V19.8.12 - Stop Repeated Text');
console.log('================================================================');
console.log('[INFO] CSS seguro:', exists('src/styles/noelle_static_theme_v19_8_12.css') ? 'presente' : 'ausente');
console.log('[INFO] Guard seguro:', exists('src/renderer/noelle_overlay_guard_v19_8_12.js') ? 'presente' : 'ausente');
if (exists('package.json')) {
  try { console.log('[INFO] version:', JSON.parse(read('package.json')).version || '(sem version)'); }
  catch { console.log('[AVISO] package.json inválido'); }
}
