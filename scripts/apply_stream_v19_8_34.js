const cp = require('child_process');
const path = require('path');
const ROOT = process.cwd();

function run(script) {
  cp.execFileSync('node', [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
}

console.log('=== CHECKUP ANTES ===');
try { run('checkup_stream_v19_8_34.js'); } catch {}

console.log('');
console.log('=== APLICANDO STREAM V19.8.34 ===');
run('patch_stream_existing_v19_8_34.js');

console.log('');
console.log('=== CHECKUP DEPOIS ===');
run('checkup_stream_v19_8_34.js');
