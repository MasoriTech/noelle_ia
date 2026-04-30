#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.12-stop-repeated-text-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_12_stop_repeated_text_${STAMP}`);

const REMOVE_TAGS = [
  /<script[^>]+noelle_theme_manager_v19_8_10(?:a)?\.js[^>]*>\s*<\/script>\s*/gi,
  /<script[^>]+noelle_config_dashboard_v19_8_11[a-z]?\.js[^>]*>\s*<\/script>\s*/gi,
  /<script[^>]+noelle_safe_theme_recovery_v19_8_11d\.js[^>]*>\s*<\/script>\s*/gi,
  /<script[^>]+noelle_overlay_guard_v19_8_12\.js[^>]*>\s*<\/script>\s*/gi,
  /<link[^>]+noelle_config_dashboard_v19_8_11[a-z]?\.css[^>]*>\s*/gi,
  /<link[^>]+noelle_safe_theme_recovery_v19_8_11d\.css[^>]*>\s*/gi,
  /<link[^>]+noelle_static_theme_v19_8_12\.css[^>]*>\s*/gi
];

const BAD_TEXT_SNIPPETS = [
  'Modo recuperação ativo.',
  'O runtime visual agressivo foi removido.',
  'Visual final da Noelle, sem botões flutuantes antigos e com tema salvo.'
];

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function fail(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }

function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, content){
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, 'utf8');
}

function backup(rel){
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok(`Backup: ${rel}`);
}

function patchControlsHtml(){
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    warn('src/controls.html não encontrado; pulando.');
    return;
  }

  backup(rel);
  let html = read(rel);

  for (const pattern of REMOVE_TAGS) {
    html = html.replace(pattern, '\n');
  }

  // Remove texto repetido que possa ter sido gravado por engano no HTML.
  for (const snippet of BAD_TEXT_SNIPPETS) {
    html = html.split(snippet).join('');
  }

  // Garante só a camada segura atual.
  const css = '  <link rel="stylesheet" href="./styles/noelle_static_theme_v19_8_12.css" data-noelle-v19-8-12="true">';
  const js = '  <script src="./renderer/noelle_overlay_guard_v19_8_12.js" defer data-noelle-v19-8-12="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${css}\n</head>`);
  else html = `${css}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${js}\n</body>`);
  else html = `${html}\n${js}\n`;

  write(rel, html);
  ok('src/controls.html limpo de runtimes que repetiam texto e com guard seguro V19.8.12.');
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) {
    warn('package.json não encontrado; pulando.');
    return;
  }

  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (err) { fail(`package.json inválido: ${err.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.12'] = 'node scripts/repair_v19_8_12_stop_repeated_text_2026.cjs';
  pkg.scripts['diagnostico:v19.8.12'] = 'node scripts/diagnostico_v19_8_12_stop_repeated_text_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.12 — Stop Repeated Text')) {
    md += '\n\n## V19.8.12 — Stop Repeated Text 2026\n\n- Remove runtimes visuais agressivos que repetiam textos/painéis na interface.\n- Mantém apenas CSS estático do tema e um guard mínimo sem MutationObserver, sem criação de texto e sem remoção de containers grandes.\n- Não reativa Avatar Lab / Room V19 legado.\n- O iniciar.bat continua único; opção [1] apenas inicia.\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.12.');
  } else {
    ok('MEMORIA_GPT_NOELLE.md já contém nota V19.8.12.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.12 - Stop Repeated Text');
  log('================================================================');

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [
    'src/styles/noelle_static_theme_v19_8_12.css',
    'src/renderer/noelle_overlay_guard_v19_8_12.js',
    'iniciar.bat'
  ].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz do projeto.`);
  });

  patchControlsHtml();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.12 terminou com problemas.');
  else {
    ok(`Reparo V19.8.12 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e reinicie o app pela opção [1].');
  }
}

main();
