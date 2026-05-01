const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const controls = path.join(ROOT, 'src', 'controls.html');
const moduleRel = './renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js';
const moduleName = 'noelle_stream_ai_reply_runtime_v19_8_34.js';

function log(msg) { console.log('[stream-v19.8.34] ' + msg); }

if (!fs.existsSync(controls)) {
  console.error('[ERRO] src/controls.html não encontrado');
  process.exit(1);
}

const backup = controls + '.bak_stream_v19_8_34';
if (!fs.existsSync(backup)) {
  fs.copyFileSync(controls, backup);
  log('backup criado: src/controls.html.bak_stream_v19_8_34');
}

let html = fs.readFileSync(controls, 'utf8');
html = html.replace(new RegExp(`<script[^>]*${moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*><\\/script>`, 'g'), `<!-- disabled ${moduleName} by stream_v19_8_34 -->`);

const tag = `<script src="${moduleRel}"></script>`;
if (html.includes('</body>')) html = html.replace('</body>', tag + '\n</body>');
else html += '\n' + tag + '\n';

fs.writeFileSync(controls, html, 'utf8');
log('runtime IA v19.8.34 injetado sem mexer na aba Stream existente');
