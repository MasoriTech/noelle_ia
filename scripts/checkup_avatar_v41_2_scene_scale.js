const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const file = path.join(ROOT, 'src', 'renderer', 'viewers', 'model_viewer_v41_app.mjs');

function status(ok, msg) { console.log((ok ? '[OK] ' : '[WARN] ') + msg); }

status(fs.existsSync(file), 'src/renderer/viewers/model_viewer_v41_app.mjs');
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  status(content.includes('fitSceneRoom'), 'função fitSceneRoom presente');
  status(content.includes('não comprimir para 2 unidades') || content.includes('não comprimir para 2 unidades'), 'comentário de room scale presente');
  status(content.includes('camera.fov = 48'), 'FOV de cenário ajustado');
  status(content.includes('let scale = 1;'), 'cenário sem compressão forçada');
  try {
    cp.execFileSync('node', ['--check', file], { cwd: ROOT, stdio: 'pipe' });
    status(true, 'node --check OK');
  } catch {
    status(false, 'node --check falhou');
  }
}
