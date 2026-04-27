#!/usr/bin/env node
/*
  Hotfix Noelle 2026 - janela Chat IA
  - Corrige ensureDir is not defined no main.js.
  - Remove titleBarOverlay/hidden titlebar da janela principal/controles para evitar sobreposicao no Windows.
  - Injeta um patch visual leve para o Chat IA atual, sem apagar a UI existente.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, 'backups', 'hotfix_chat_ia_' + stamp);
const report = [];
const warnings = [];

function rel(p) { return path.relative(root, p).replace(/\\/g, '/'); }
function exists(relPath) { return fs.existsSync(path.join(root, relPath)); }
function read(relPath) { return fs.readFileSync(path.join(root, relPath), 'utf8'); }
function write(relPath, text) { fs.mkdirSync(path.dirname(path.join(root, relPath)), { recursive: true }); fs.writeFileSync(path.join(root, relPath), text, 'utf8'); }
function backup(relPath) {
  const from = path.join(root, relPath);
  if (!fs.existsSync(from)) return;
  const to = path.join(backupDir, relPath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  report.push('Backup: ' + relPath + ' -> ' + rel(to));
}
function fail(message) {
  console.error('\n[ERRO] ' + message);
  process.exit(1);
}

if (!exists('package.json')) fail('Rode este arquivo dentro da raiz do repo noelle_ia, onde fica package.json.');
if (!exists('main.js')) fail('main.js nao encontrado na raiz.');
if (!exists('src/controls.html')) warnings.push('src/controls.html nao encontrado; o patch visual nao sera injetado.');

fs.mkdirSync(backupDir, { recursive: true });

function patchMain() {
  const file = 'main.js';
  backup(file);
  let text = read(file);
  let changed = false;

  if (!/function\s+ensureDir\s*\(/.test(text) && !/(const|let|var)\s+ensureDir\s*=/.test(text)) {
    const helper = `\nfunction ensureDir(dirPath) {\n  if (!dirPath) return false;\n  try {\n    fs.mkdirSync(dirPath, { recursive: true });\n    return true;\n  } catch (err) {\n    try { log?.warn?.("ensureDir falhou:", err?.message || err); } catch (_) {}\n    return false;\n  }\n}\n`;
    if (text.includes('function appendNoelleCoreLog')) {
      text = text.replace('function appendNoelleCoreLog', helper + 'function appendNoelleCoreLog');
    } else {
      text += helper;
    }
    changed = true;
    report.push('main.js: helper ensureDir adicionada.');
  } else {
    report.push('main.js: ensureDir ja existe, nada a alterar nesse ponto.');
  }

  const hiddenTitlebarPattern = /frame:\s*true,\s*titleBarStyle:\s*process\.platform\s*===\s*["']darwin["']\s*\?\s*["']hiddenInset["']\s*:\s*["']hidden["'],\s*\.\.\.\(process\.platform\s*!==\s*["']darwin["']\s*\?\s*\{\s*titleBarOverlay:\s*\{\s*color:\s*["']#[0-9a-fA-F]{6}["'],\s*symbolColor:\s*["']#[0-9a-fA-F]{6}["'],\s*height:\s*\d+\s*\}\s*\}\s*:\s*\{\}\),/g;
  let count = 0;
  text = text.replace(hiddenTitlebarPattern, () => {
    count += 1;
    return 'frame: true, titleBarStyle: "default",';
  });
  if (count > 0) {
    changed = true;
    report.push('main.js: titleBarOverlay/hidden removido em ' + count + ' janela(s).');
  } else {
    warnings.push('main.js: nao encontrei o padrao exato da titlebar para trocar. Se a barra ainda sobrepor, edite manualmente frame/titleBarStyle.');
  }

  if (changed) write(file, text);
}

function copyPatchAssets() {
  const cssSource = path.join(root, 'src', 'styles', 'noelle_chat_focus_patch.css');
  const jsSource = path.join(root, 'src', 'renderer', 'noelle_chat_focus_patch.js');
  if (!fs.existsSync(cssSource)) warnings.push('Arquivo do pack ausente: src/styles/noelle_chat_focus_patch.css');
  if (!fs.existsSync(jsSource)) warnings.push('Arquivo do pack ausente: src/renderer/noelle_chat_focus_patch.js');
}

function patchControlsHtml() {
  if (!exists('src/controls.html')) return;
  const file = 'src/controls.html';
  backup(file);
  let text = read(file);
  let changed = false;

  if (!text.includes('noelle_chat_focus_patch.css')) {
    const link = '  <link rel="stylesheet" href="./styles/noelle_chat_focus_patch.css" data-noelle-hotfix="chat-focus" />\n';
    if (text.includes('</head>')) {
      text = text.replace('</head>', link + '</head>');
      changed = true;
    } else {
      warnings.push('src/controls.html: nao encontrei </head>; CSS nao foi injetado automaticamente.');
    }
  }

  if (!text.includes('noelle_chat_focus_patch.js')) {
    const script = '  <script type="module" src="./renderer/noelle_chat_focus_patch.js" data-noelle-hotfix="chat-focus"></script>\n';
    if (text.includes('</body>')) {
      text = text.replace('</body>', script + '</body>');
      changed = true;
    } else {
      warnings.push('src/controls.html: nao encontrei </body>; JS visual nao foi injetado automaticamente.');
    }
  }

  if (changed) {
    write(file, text);
    report.push('src/controls.html: patch visual do Chat IA injetado.');
  } else {
    report.push('src/controls.html: patch visual ja estava injetado ou nao precisou alterar.');
  }
}

function patchPackageScripts() {
  const file = 'package.json';
  backup(file);
  let pkg;
  try { pkg = JSON.parse(read(file)); }
  catch (err) { warnings.push('package.json invalido para patch de scripts: ' + err.message); return; }
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts['chat:ia']) {
    pkg.scripts['chat:ia'] = 'electron tools/noelle_chat_discord/main.cjs';
    report.push('package.json: script npm run chat:ia adicionado.');
  }
  if (!pkg.scripts['diag:chat']) {
    pkg.scripts['diag:chat'] = 'node scripts/diagnostico_noelle_chat_correcoes.cjs';
    report.push('package.json: script npm run diag:chat adicionado.');
  }
  write(file, JSON.stringify(pkg, null, 2) + '\n');
}

patchMain();
copyPatchAssets();
patchControlsHtml();
patchPackageScripts();

const finalReport = [
  'HOTFIX NOELLE CHAT IA 2026',
  'Aplicado em: ' + new Date().toISOString(),
  'Pasta: ' + root,
  '',
  'Alteracoes:',
  ...report.map(x => '- ' + x),
  '',
  warnings.length ? 'Avisos:' : 'Avisos: nenhum',
  ...warnings.map(x => '- ' + x),
  '',
  'Proximos passos:',
  '1. Feche todas as janelas da Noelle.',
  '2. Rode iniciar.bat para testar a janela principal.',
  '3. Rode ABRIR_CHAT_IA_CORRIGIDO.bat para testar o chat dedicado.',
  '4. Rode RODAR_DIAGNOSTICO_CHAT_CORRIGIDO.bat se algo falhar.',
].join('\n');

write(path.join('logs', 'hotfix_chat_ia_2026_' + stamp + '.txt'), finalReport);
console.log('\n' + finalReport + '\n');
