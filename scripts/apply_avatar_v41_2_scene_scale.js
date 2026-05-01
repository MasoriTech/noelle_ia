const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const target = path.join(ROOT, 'src', 'renderer', 'viewers', 'model_viewer_v41_app.mjs');
const source = path.join(__dirname, '..', 'src', 'renderer', 'viewers', 'model_viewer_v41_app.mjs');

function log(msg) { console.log('[avatar-v41.2-scene-scale] ' + msg); }

if (!fs.existsSync(target)) {
  console.error('Arquivo alvo não encontrado: ' + target);
  process.exit(1);
}

const backup = target + '.bak_v41_2_scene_scale';
if (!fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
  log('backup criado: ' + path.relative(ROOT, backup));
}

fs.copyFileSync(source, target);
log('viewer atualizado: ' + path.relative(ROOT, target));

try {
  cp.execFileSync('node', ['--check', target], { cwd: ROOT, stdio: 'inherit' });
  log('node --check OK');
} catch (err) {
  console.error('Falha no node --check');
  process.exit(1);
}
