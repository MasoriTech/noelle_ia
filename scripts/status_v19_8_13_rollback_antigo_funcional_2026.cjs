#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
console.log('================================================================');
console.log(' Status V19.8.13 - Rollback antigo funcional');
console.log('================================================================');
console.log('[INFO] controls.html:', exists('src/controls.html') ? 'presente' : 'ausente');
if (exists('src/controls.html')) console.log('[INFO] controls.html bytes:', read('src/controls.html').length);
if (exists('package.json')) {
  try { console.log('[INFO] version:', JSON.parse(read('package.json')).version || '(sem version)'); }
  catch { console.log('[AVISO] package.json inválido'); }
}
