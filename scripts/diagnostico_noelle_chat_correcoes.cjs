const fs = require('fs');
const path = require('path');

const root = process.cwd();
const problems = [];
const warnings = [];
const ok = [];

function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function check(cond, pass, fail, warn = false) { if (cond) ok.push(pass); else (warn ? warnings : problems).push(fail); }

check(exists('package.json'), 'package.json encontrado', 'package.json ausente: rode na raiz do noelle_ia');
check(exists('main.js'), 'main.js encontrado', 'main.js ausente');
check(exists('preload.js'), 'preload.js encontrado', 'preload.js ausente');
check(exists('src/controls.html'), 'src/controls.html encontrado', 'src/controls.html ausente');
check(exists('tools/noelle_chat_discord/main.cjs'), 'janela dedicada instalada', 'tools/noelle_chat_discord/main.cjs ausente');
check(exists('ABRIR_CHAT_IA_CORRIGIDO.bat'), 'BAT de abertura encontrado', 'ABRIR_CHAT_IA_CORRIGIDO.bat ausente');
check(exists('APLICAR_HOTFIX_JANELA_CHAT.bat'), 'BAT de hotfix encontrado', 'APLICAR_HOTFIX_JANELA_CHAT.bat ausente');
check(exists('src/styles/noelle_chat_focus_patch.css'), 'CSS de foco do chat instalado', 'CSS de foco do chat ausente', true);
check(exists('src/renderer/noelle_chat_focus_patch.js'), 'JS de foco do chat instalado', 'JS de foco do chat ausente', true);

if (exists('package.json')) {
  try {
    const pkg = JSON.parse(read('package.json'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    check(!!deps.electron, 'Electron declarado no package.json', 'Electron nao declarado no package.json');
    check(!!pkg.scripts, 'scripts existem no package.json', 'package.json sem scripts', true);
    check(!!pkg.scripts?.['chat:ia'] || exists('ABRIR_CHAT_IA_CORRIGIDO.bat'), 'atalho do chat disponivel', 'sem script chat:ia e sem BAT', true);
  } catch (err) {
    problems.push('package.json invalido: ' + err.message);
  }
}

if (exists('main.js')) {
  const main = read('main.js');
  const hasEnsureDir = /function\s+ensureDir\s*\(/.test(main) || /(const|let|var)\s+ensureDir\s*=/.test(main);
  check(hasEnsureDir, 'ensureDir existe no main.js', 'BUG: ensureDir ainda nao existe no main.js. Rode APLICAR_HOTFIX_JANELA_CHAT.bat');
  check(!/titleBarOverlay/.test(main), 'sem titleBarOverlay no main.js', 'titleBarOverlay ainda aparece; pode continuar sobrepondo a barra no Windows', true);
  check(/noelleCoreTranscribeAudio|transcribe/i.test(main), 'rotina de STT/transcricao localizada', 'nao localizei rotina de STT/transcricao no main.js', true);
}

if (exists('src/controls.html')) {
  const html = read('src/controls.html');
  check(/noelle_chat_focus_patch\.css/.test(html), 'CSS visual injetado no controls.html', 'CSS visual ainda nao foi injetado no controls.html. Rode APLICAR_HOTFIX_JANELA_CHAT.bat', true);
  check(/noelle_chat_focus_patch\.js/.test(html), 'JS visual injetado no controls.html', 'JS visual ainda nao foi injetado no controls.html. Rode APLICAR_HOTFIX_JANELA_CHAT.bat', true);
}

console.log('\nRESULTADO DO DIAGNOSTICO');
console.log('========================');
console.log('\nOK:');
ok.forEach((x) => console.log('  [OK] ' + x));
if (warnings.length) {
  console.log('\nAVISOS:');
  warnings.forEach((x) => console.log('  [AVISO] ' + x));
}
if (problems.length) {
  console.log('\nPROBLEMAS:');
  problems.forEach((x) => console.log('  [ERRO] ' + x));
  process.exitCode = 1;
} else {
  console.log('\nSem problemas criticos.');
}
