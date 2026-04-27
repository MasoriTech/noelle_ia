const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
function p(...x) { return path.join(root, ...x); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function checkJs(file) {
  if (!exists(file)) return 'AUSENTE';
  try { cp.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); return 'OK'; }
  catch (e) { return 'ERRO: ' + String(e.stderr || e.message).slice(0, 400); }
}
const files = [
  'package.json',
  'main.js',
  'preload.js',
  'src/controls.html',
  'src/renderer/controls_window_app.js',
  'src/renderer/noelle_chat_v12.js',
  'src/styles/noelle_chat_v12.css',
];
console.log('============================================================');
console.log(' Diagnostico Noelle UI V12');
console.log('============================================================');
for (const f of files) console.log(`${exists(p(f)) ? 'OK     ' : 'FALTA  '} ${f}`);
console.log('');
for (const f of ['main.js', 'preload.js', 'src/renderer/controls_window_app.js', 'src/renderer/noelle_chat_v12.js']) {
  if (exists(p(f))) console.log(`node --check ${f}: ${checkJs(p(f))}`);
}
if (exists(p('src/controls.html'))) {
  const html = read(p('src/controls.html'));
  console.log('');
  console.log(`V12 CSS injetado: ${html.includes('noelle_chat_v12.css') ? 'SIM' : 'NAO'}`);
  console.log(`V12 JS injetado:  ${html.includes('noelle_chat_v12.js') ? 'SIM' : 'NAO'}`);
  console.log(`Patches antigos aparentes: ${/noelle_chat_(focus_patch|safe_repair|layout_moderno|janela_fix|window_fix|v\d+)/i.test(html) ? 'SIM' : 'NAO'}`);
  console.log(`Aba Chat no HTML: ${/Chat IA|NoelleCore|Ollama/i.test(html) ? 'SIM' : 'NAO'}`);
  console.log(`Emotes antigos no HTML: ${/Emotes|motion|carousel|emote/i.test(html) ? 'SIM' : 'NAO'}`);
  console.log(`Configuracoes antigas no HTML: ${/Configura|themeSelect|performanceMode|preset/i.test(html) ? 'SIM' : 'NAO'}`);
}
try {
  cp.execFileSync('ollama', ['--version'], { stdio: 'pipe' });
  console.log('Ollama no PATH: SIM');
} catch { console.log('Ollama no PATH: NAO ou nao instalado'); }
console.log('');
console.log('Se o diagnostico estiver OK, abra a Noelle e teste: Principal, Emotes, Configuracoes e Chat IA.');
