const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } }
function nodeCheck(rel) {
  try { cp.execFileSync('node', ['--check', rel], { cwd: ROOT, stdio: 'pipe' }); return true; }
  catch { return false; }
}
function line(ok, msg) { console.log((ok ? '[OK] ' : '[WARN] ') + msg); }

console.log('Stream V19.8.34 Checkup');
console.log('========================');
[
  'src/renderer/pages/noelle_stream_page_v19_8_29.js',
  'src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js',
  'src/renderer/modules/noelle_stream_vad_v19_8_31.js',
  'src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js',
  'src/renderer/modules/noelle_stream_finalize_v19_8_33.js',
  'src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js'
].forEach((rel) => line(exists(rel), rel));

console.log('');
console.log('node --check:');
[
  'src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js',
  'scripts/patch_stream_existing_v19_8_34.js',
  'scripts/checkup_stream_v19_8_34.js',
  'scripts/apply_stream_v19_8_34.js',
  'scripts/rollback_stream_v19_8_34.js',
  'scripts/selftest_stream_v19_8_34.js'
].forEach((rel) => line(nodeCheck(rel), rel));

const controls = read('src/controls.html');
if (controls) {
  const active = (controls.match(/<script[^>]*noelle_stream_ai_reply_runtime_v19_8_34\.js[^>]*><\/script>/g) || []).length;
  console.log('');
  line(active === 1, 'runtime IA v19.8.34 ativo uma vez no controls.html');
}

const preload = read('preload.js');
if (preload) {
  line(/chat:\s*\(payload\)\s*=>\s*invoke\("noelle:chat"/.test(preload) || preload.includes('noelle:chat'), 'preload expõe noelleAPI.chat');
}
