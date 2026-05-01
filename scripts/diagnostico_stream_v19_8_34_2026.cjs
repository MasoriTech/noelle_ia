/* Diagnóstico Stream V19.8.34 — 2026 */
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const files = [
  'src/renderer/modules/noelle_tab_router_v19_8_34.js',
  'src/renderer/pages/noelle_stream_page_v19_8_29.js',
  'src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js',
  'src/renderer/modules/noelle_stream_vad_v19_8_31.js',
  'src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js'
];

let ok = true;
console.log('================================================================');
console.log(' Noelle Stream V19.8.34 - diagnostico');
console.log('================================================================');

for (const file of files) {
  if (!fs.existsSync(file)) { console.log('[AVISO] ausente:', file); continue; }
  const r = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('[ERRO] node --check falhou:', file); console.log(r.stderr || r.stdout); ok = false; }
  else console.log('[OK] node --check', file);
}

const htmls = ['src/index.html','index.html','src/renderer/index.html'].filter((f) => fs.existsSync(f));
if (!htmls.length) {
  console.log('[AVISO] HTML principal nao encontrado nos caminhos comuns.');
} else {
  let found = false;
  for (const h of htmls) {
    const text = fs.readFileSync(h, 'utf8');
    const has = text.includes('noelle_tab_router_v19_8_34.js');
    console.log(has ? '[OK] router no HTML:' : '[AVISO] router nao aparece no HTML:', h);
    found ||= has;
  }
  if (!found) ok = false;
}

console.log('----------------------------------------------------------------');
if (ok) {
  console.log('[OK] V19.8.34 pronta: troca de aba reforcada. Teste abrir Chat/Avatar/Stream varias vezes.');
  process.exit(0);
}
console.log('[ERRO] Corrija os itens acima antes de iniciar.');
process.exit(1);
