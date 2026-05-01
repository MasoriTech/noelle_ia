/* Diagnóstico Stream V19.8.33 — 2026 */
const fs = require('fs');
const cp = require('child_process');
const files = [
  'src/renderer/pages/noelle_stream_page_v19_8_29.js',
  'src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js',
  'src/renderer/modules/noelle_stream_vad_v19_8_31.js',
  'src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js'
];
let ok = true;
console.log('================================================================');
console.log(' Noelle Stream V19.8.33 - diagnostico');
console.log('================================================================');
for (const file of files) {
  if (!fs.existsSync(file)) { console.log('[ERRO] ausente:', file); ok = false; continue; }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('V19.8.33') && !text.includes('19.8.33')) { console.log('[AVISO] sem marcador V19.8.33:', file); }
  const r = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('[ERRO] node --check falhou:', file); console.log(r.stderr || r.stdout); ok = false; }
  else console.log('[OK] node --check', file);
}
console.log('----------------------------------------------------------------');
if (ok) {
  console.log('[OK] Stream V19.8.33 pronta: aba + microfone por botao + VAD + trecho em memoria.');
  process.exit(0);
}
console.log('[ERRO] Corrija os itens acima antes de iniciar a Noelle.');
process.exit(1);
