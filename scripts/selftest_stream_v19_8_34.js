const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const ROOT = process.cwd();
let failed = false;

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { failed = true; console.log('[ERRO] ' + msg); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function nodeCheck(rel) {
  try { cp.execFileSync('node', ['--check', rel], { cwd: ROOT, stdio: 'pipe' }); ok('node --check ' + rel); }
  catch { fail('node --check ' + rel); }
}

console.log('Selftest Stream V19.8.34');
console.log('=========================');
[
  'src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js',
  'scripts/patch_stream_existing_v19_8_34.js',
  'scripts/checkup_stream_v19_8_34.js',
  'scripts/apply_stream_v19_8_34.js',
  'scripts/rollback_stream_v19_8_34.js'
].forEach((rel) => exists(rel) ? ok('existe ' + rel) : fail('faltando ' + rel));

[
  'src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js',
  'scripts/patch_stream_existing_v19_8_34.js',
  'scripts/checkup_stream_v19_8_34.js',
  'scripts/apply_stream_v19_8_34.js',
  'scripts/rollback_stream_v19_8_34.js'
].forEach(nodeCheck);

const runtime = read('src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js');
runtime.includes('noelle-stream-transcript-ready-v19833') ? ok('escuta transcript-ready v19.8.33') : fail('não escuta transcript-ready');
runtime.includes('window.noelleAPI?.chat') ? ok('usa noelleAPI.chat') : fail('não usa noelleAPI.chat');
runtime.includes('shouldRespond') ? ok('StreamGuard antes da IA') : fail('sem StreamGuard');
runtime.includes('TTS continua desligado') ? ok('sem TTS nesta fase') : fail('TTS não documentado como desligado');

if (failed) process.exit(1);
