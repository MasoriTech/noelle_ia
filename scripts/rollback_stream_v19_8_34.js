const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const controls = path.join(ROOT, 'src', 'controls.html');
const backup = controls + '.bak_stream_v19_8_34';

if (!fs.existsSync(backup)) {
  console.log('[INFO] backup não encontrado: src/controls.html.bak_stream_v19_8_34');
  process.exit(0);
}

fs.copyFileSync(backup, controls);
console.log('[OK] controls.html restaurado do backup v19.8.34');
