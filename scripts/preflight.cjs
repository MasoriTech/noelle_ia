const fs = require('fs');
const path = require('path');

const root = process.cwd();
const required = [
  'main/main.js',
  'preload/preload.js',
  'renderer/index.html',
  'core/ai/ollama_client.js',
  'core/voice/voice_pipeline.js',
  'config/app_config.json'
];

let ok = true;
console.log('================================================================');
console.log(' Noelle v20 - preflight');
console.log('================================================================');
for (const rel of required) {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) console.log('[OK] ' + rel);
  else { console.log('[ERRO] ausente: ' + rel); ok = false; }
}
console.log('----------------------------------------------------------------');
console.log(ok ? '[OK] Estrutura base pronta.' : '[ERRO] Estrutura incompleta.');
process.exit(ok ? 0 : 1);
