const fs = require('fs');
const path = require('path');

const root = process.cwd();
const problems = [];
const warnings = [];
const ok = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function sizeKb(rel) {
  return Math.round(fs.statSync(path.join(root, rel)).size / 1024);
}
function check(cond, pass, fail, warn = false) {
  if (cond) ok.push(pass);
  else (warn ? warnings : problems).push(fail);
}

check(exists('package.json'), 'package.json encontrado', 'package.json ausente: rode este diagnóstico na raiz do noelle_ia');
check(exists('main.js'), 'main.js encontrado', 'main.js ausente');
check(exists('preload.js'), 'preload.js encontrado', 'preload.js ausente');
check(exists('src/controls.html'), 'src/controls.html encontrado', 'src/controls.html ausente');
check(exists('tools/noelle_chat_discord/main.cjs'), 'janela dedicada instalada', 'tools/noelle_chat_discord/main.cjs ausente');
check(exists('ABRIR_CHAT_IA_DECENTE.bat'), 'BAT de abertura encontrado', 'ABRIR_CHAT_IA_DECENTE.bat ausente');

if (exists('package.json')) {
  try {
    const pkg = JSON.parse(read('package.json'));
    check(!!pkg.dependencies || !!pkg.devDependencies, 'package.json tem dependências', 'package.json não tem dependências');
    const hasElectron = !!(pkg.devDependencies && pkg.devDependencies.electron) || !!(pkg.dependencies && pkg.dependencies.electron);
    check(hasElectron, 'Electron declarado no package.json', 'Electron não declarado no package.json');
    const hasStart = !!(pkg.scripts && pkg.scripts.start);
    check(hasStart, 'script start encontrado', 'script start ausente', true);
  } catch (err) {
    problems.push('package.json inválido: ' + err.message);
  }
}

if (exists('preload.js')) {
  const preload = read('preload.js');
  check(preload.includes('noelleCoreChat'), 'preload expõe noelleCoreChat', 'preload não expõe noelleCoreChat');
  check(preload.includes('contextBridge'), 'preload usa contextBridge', 'preload sem contextBridge');
}

if (exists('main.js')) {
  const main = read('main.js');
  check(main.includes('noelle-core-chat'), 'main.js tem handler noelle-core-chat', 'main.js não tem handler noelle-core-chat');
  if (main.length > 120000) warnings.push('main.js está muito grande; separar NoelleCore/Ollama em módulo próprio reduziria bugs.');
}

if (exists('src/controls.html')) {
  const kb = sizeKb('src/controls.html');
  if (kb > 45) warnings.push(`src/controls.html tem ${kb} KB; UI de chat misturada com controles pode ficar frágil.`);
  const html = read('src/controls.html');
  check(html.includes('NoelleCore') || html.includes('Chat IA'), 'controls.html contém área de Chat IA', 'controls.html não parece conter Chat IA', true);
}

if (exists('src/index.html')) {
  const idx = read('src/index.html').trim();
  const looksHtml = /<!doctype html|<html/i.test(idx);
  if (!looksHtml) warnings.push('src/index.html não parece HTML completo; se algum fluxo carregar esse arquivo, pode quebrar ou mostrar texto solto.');
}

const report = [];
report.push('DIAGNÓSTICO NOELLE CHAT IA');
report.push('==========================');
report.push('Raiz: ' + root);
report.push('');
report.push('[OK]');
report.push(ok.length ? ok.map((x) => '- ' + x).join('\n') : '- nenhum');
report.push('');
report.push('[AVISOS]');
report.push(warnings.length ? warnings.map((x) => '- ' + x).join('\n') : '- nenhum');
report.push('');
report.push('[PROBLEMAS]');
report.push(problems.length ? problems.map((x) => '- ' + x).join('\n') : '- nenhum crítico');
report.push('');
report.push('Próximo passo: rode ABRIR_CHAT_IA_DECENTE.bat e teste com Ollama aberto.');

const output = report.join('\n');
console.log(output);
try { fs.writeFileSync(path.join(root, 'RELATORIO_DIAGNOSTICO_CHAT_RUNTIME.txt'), output, 'utf8'); } catch (_) {}
process.exit(problems.length ? 1 : 0);
