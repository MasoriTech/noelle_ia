#!/usr/bin/env node
/*
  Noelle Chat IA - correcao v4 iniciar unico
  Foco:
  - manter no maximo um BAT no pack;
  - corrigir ensureDir ausente;
  - remover patch visual v1 que causava sobreposicao;
  - aplicar CSS seguro v4;
  - limpar BATs antigos criados por packs de chat anteriores.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, 'backups', 'chat_ia_v4_' + stamp);
const report = [];
const warnings = [];

function p(rel) { return path.join(root, rel); }
function exists(rel) { return fs.existsSync(p(rel)); }
function read(rel) { return fs.readFileSync(p(rel), 'utf8'); }
function write(rel, txt) { fs.mkdirSync(path.dirname(p(rel)), { recursive: true }); fs.writeFileSync(p(rel), txt, 'utf8'); }
function backup(rel) {
  if (!exists(rel)) return;
  const to = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(p(rel), to);
  report.push('backup criado: ' + rel);
}
function fail(msg) { console.error('\n[ERRO] ' + msg + '\n'); process.exit(1); }

if (!exists('package.json')) fail('extraia/rode este pack na raiz do repositorio noelle_ia, onde fica package.json.');
fs.mkdirSync(backupDir, { recursive: true });

function cleanupOldChatBats() {
  const old = [
    'ABRIR_CHAT_IA_DECENTE.bat',
    'RODAR_DIAGNOSTICO_CHAT.bat',
    'APLICAR_HOTFIX_JANELA_CHAT.bat',
    'ABRIR_CHAT_IA_CORRIGIDO.bat',
    'RODAR_DIAGNOSTICO_CHAT_CORRIGIDO.bat',
    'APLICAR_CORRECAO_CHAT_V2.bat',
    'RODAR_DIAGNOSTICO_CHAT_V2.bat',
    'ABRIR_CHAT_IA_LIMPO.bat',
    'INICIAR_OLLAMA_E_CHAT_LIMPO.bat',
    'NOELLE_CHAT.bat',
    'INICIAR_CHAT.bat',
    'INICIAR_NOELLE_CHAT.bat'
  ];
  for (const rel of old) {
    if (!exists(rel)) continue;
    backup(rel);
    try {
      fs.unlinkSync(p(rel));
      report.push('BAT antigo removido: ' + rel);
    } catch (err) {
      warnings.push('nao consegui remover ' + rel + ': ' + err.message);
    }
  }
}

function patchControlsHtml() {
  const rel = 'src/controls.html';
  if (!exists(rel)) { warnings.push('src/controls.html nao encontrado.'); return; }
  backup(rel);
  let txt = read(rel);
  const before = txt;

  // Remove linhas do hotfix v1 que empilhavam input/botoes sobre o chat.
  txt = txt.replace(/^.*noelle_chat_focus_patch\.css.*(?:\r?\n)?/gmi, '');
  txt = txt.replace(/^.*noelle_chat_focus_patch\.js.*(?:\r?\n)?/gmi, '');
  txt = txt.replace(/^.*data-noelle-hotfix=["']chat-focus["'].*(?:\r?\n)?/gmi, '');

  // Evita duplicar o CSS seguro.
  txt = txt.replace(/^.*noelle_chat_safe_repair\.css.*(?:\r?\n)?/gmi, '');
  const link = '  <link rel="stylesheet" href="./styles/noelle_chat_safe_repair.css" data-noelle-hotfix="chat-safe-v4" />\n';
  if (txt.includes('</head>')) txt = txt.replace('</head>', link + '</head>');
  else warnings.push('nao encontrei </head>; adicione manualmente src/styles/noelle_chat_safe_repair.css.');

  if (txt !== before) {
    write(rel, txt);
    report.push('src/controls.html: patch visual antigo removido e CSS seguro aplicado.');
  } else {
    report.push('src/controls.html: ja estava ajustado.');
  }
}

function patchMainJs() {
  const rel = 'main.js';
  if (!exists(rel)) { warnings.push('main.js nao encontrado; ensureDir/titlebar nao foram alterados.'); return; }
  backup(rel);
  let txt = read(rel);
  let changed = false;

  const hasEnsure = /function\s+ensureDir\s*\(/.test(txt) || /(?:const|let|var)\s+ensureDir\s*=/.test(txt);
  if (!hasEnsure) {
    const helper = `\nfunction ensureDir(dirPath) {\n  if (!dirPath) return false;\n  try {\n    fs.mkdirSync(dirPath, { recursive: true });\n    return true;\n  } catch (err) {\n    try { console.warn('[Noelle] ensureDir falhou:', err && (err.message || err)); } catch (_) {}\n    return false;\n  }\n}\n`;
    const fsRequire = /const\s+fs\s*=\s*require\(["']fs["']\);?/;
    if (fsRequire.test(txt)) txt = txt.replace(fsRequire, (m) => m + helper);
    else {
      txt = `const fs = require('fs');\n` + helper + '\n' + txt;
      warnings.push('nao achei const fs=require("fs"); inseri require fs + ensureDir no topo.');
    }
    changed = true;
    report.push('main.js: ensureDir adicionada.');
  } else {
    report.push('main.js: ensureDir ja existe.');
  }

  const beforeTitle = txt;
  txt = txt.replace(/titleBarStyle\s*:\s*["']hidden["']/g, 'titleBarStyle: "default"');
  txt = txt.replace(/titleBarStyle\s*:\s*process\.platform\s*===\s*["']darwin["']\s*\?\s*["']hiddenInset["']\s*:\s*["']hidden["']/g, 'titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default"');
  txt = txt.replace(/,?\s*titleBarOverlay\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
  if (txt !== beforeTitle) {
    changed = true;
    report.push('main.js: titlebar hidden/overlay ajustada quando encontrada.');
  }

  if (changed) write(rel, txt);
}

function patchPackageJson() {
  const rel = 'package.json';
  if (!exists(rel)) return;
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (err) { warnings.push('package.json invalido: ' + err.message); return; }
  pkg.scripts = pkg.scripts || {};
  let changed = false;
  if (!pkg.scripts['chat:limpo']) { pkg.scripts['chat:limpo'] = 'electron tools/noelle_chat_clean/main.cjs'; changed = true; }
  if (!pkg.scripts['diag:chat']) { pkg.scripts['diag:chat'] = 'node scripts/diagnostico_chat_v4.cjs'; changed = true; }
  if (changed) {
    write(rel, JSON.stringify(pkg, null, 2) + '\n');
    report.push('package.json: scripts chat:limpo e diag:chat adicionados.');
  } else {
    report.push('package.json: scripts de chat ja existem.');
  }
}

cleanupOldChatBats();
patchControlsHtml();
patchMainJs();
patchPackageJson();

const out = [
  'NOELLE CHAT IA - CORRECAO V4 INICIAR UNICO',
  'Aplicado em: ' + new Date().toISOString(),
  'Raiz: ' + root,
  '',
  'Alteracoes:',
  ...report.map(x => '- ' + x),
  '',
  warnings.length ? 'Avisos:' : 'Avisos: nenhum',
  ...warnings.map(x => '- ' + x),
  '',
  'Uso recomendado:',
  '- Use somente INICIAR.bat.',
  '- Opcao 1 aplica/repara.',
  '- Opcao 2 diagnostica.',
  '- Opcao 3 abre o chat limpo.',
  '- Opcao 4 tenta iniciar o Ollama e abre o chat.',
  '',
  'Importante:',
  '- ECONNREFUSED 127.0.0.1:11434 significa Ollama fechado/offline.',
].join('\n');
write('logs/chat_ia_correcao_v4_' + stamp + '.txt', out);
console.log('\n' + out + '\n');
