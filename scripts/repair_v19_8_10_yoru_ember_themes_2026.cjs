#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.10-yoru-ember-themes-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_10_yoru_ember_themes_${STAMP}`);

const CSS_REF = 'src/styles/noelle_themes_v19_8_10.css';
const JS_REF = 'src/renderer/noelle_theme_manager_v19_8_10.js';

function log(msg) { console.log(msg); }
function ok(msg) { log(`[OK] ${msg}`); }
function warn(msg) { log(`[AVISO] ${msg}`); }
function fail(msg) { log(`[ERRO] ${msg}`); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function backup(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
  ok(`Backup: ${rel}`);
}

function removeThemeTags(html) {
  let out = html;
  const patterns = [
    /\s*<link[^>]+noelle_themes_v19_8_10\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_theme_manager_v19_8_10\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_themes_v19_8_9[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_theme_manager_v19_8_9[^>]*>\s*<\/script>\s*/gi
  ];
  for (const pattern of patterns) out = out.replace(pattern, '\n');
  return out;
}

function patchControlsHtml() {
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    warn('src/controls.html não encontrado; pulando injeção do tema.');
    return;
  }
  backup(rel);
  let html = read(rel);
  html = removeThemeTags(html);

  const cssTag = `  <link rel="stylesheet" href="./styles/noelle_themes_v19_8_10.css" data-noelle-theme-v19-8-10="true">`;
  const jsTag = `  <script src="./renderer/noelle_theme_manager_v19_8_10.js" defer data-noelle-theme-v19-8-10="true"></script>`;

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${cssTag}\n</head>`);
  else html = `${cssTag}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${jsTag}\n</body>`);
  else html = `${html}\n${jsTag}\n`;

  // Atualiza textos antigos sem depender de layout específico.
  html = html.replace(/Abrir avatar/g, 'Abrir Widget');
  html = html.replace(/O INICIAR\.bat instala STT\/TTS[^<\n]*/gi, 'O iniciar.bat agora inicia limpo. Use Configurações/Diagnóstico para verificar TTS, STT e Ollama.');
  html = html.replace(/INICIAR\.bat/g, 'iniciar.bat');

  write(rel, html);
  ok('src/controls.html atualizado com tema Yoru Ember V19.8.10.');
}

function patchPackageJson() {
  const rel = 'package.json';
  if (!exists(rel)) {
    warn('package.json não encontrado; pulando atualização de scripts.');
    return;
  }
  backup(rel);
  const file = path.join(ROOT, rel);
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { fail(`package.json inválido: ${err.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.10-themes'] = 'node scripts/repair_v19_8_10_yoru_ember_themes_2026.cjs';
  pkg.scripts['diagnostico:v19.8.10-themes'] = 'node scripts/diagnostico_v19_8_10_yoru_ember_themes_2026.cjs';
  pkg.scripts['status:v19.8.10-themes'] = 'node scripts/status_v19_8_10_yoru_ember_themes_2026.cjs';

  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory() {
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) {
    warn('MEMORIA_GPT_NOELLE.md não encontrado; pulando nota de memória.');
    return;
  }
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.10 — Temas Yoru Ember')) {
    md += `\n\n## V19.8.10 — Temas Yoru Ember 2026\n\n- Tema principal da Yoru: \`Yoru Ember\` / id interno \`yoru-ember\`.\n- O sistema de temas deve preservar Chat IA, Room, Widget, Preview, VRM, VRMA, expressions PNG e items GLB.\n- \`iniciar.bat\` deve continuar único; a opção [1] apenas inicia o programa e não aplica patch.\n- O runtime de tema pode estilizar botões e instalar painel em Configurações, mas não deve criar overlay flutuante nem reativar Avatar Lab / Room V19.\n- Botões devem acompanhar a tela: flex-wrap, largura segura, foco visível e estados primary/secondary/room/widget/preview/danger.\n`;
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.10.');
  } else {
    ok('MEMORIA_GPT_NOELLE.md já contém nota V19.8.10.');
  }
}

function writeDefaultThemeSettings() {
  const rel = 'data/noelle_theme_settings.json';
  if (!exists('data')) fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  backup(rel);
  const settings = {
    version: VERSION,
    defaultTheme: 'yoru-ember',
    activeTheme: 'yoru-ember',
    themes: ['yoru-ember', 'noelle-noir', 'yoru-midnight', 'sakura-dark', 'cyber-violet', 'crimson-glass', 'forest-spirit', 'light-pearl'],
    notes: 'Arquivo de referência. O renderer salva a escolha em localStorage para não depender de IPC.'
  };
  write(rel, JSON.stringify(settings, null, 2) + '\n');
  ok('data/noelle_theme_settings.json criado/atualizado.');
}

function verifyPackFiles() {
  const required = [CSS_REF, JS_REF, 'iniciar.bat'];
  for (const rel of required) {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz.`);
  }
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.10 - Mega Pack Temas Yoru Ember');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  verifyPackFiles();
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  writeDefaultThemeSettings();
  if (process.exitCode) {
    fail('Reparo V19.8.10 terminou com problemas.');
  } else {
    ok(`Reparo V19.8.10 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode: node scripts\\diagnostico_v19_8_10_yoru_ember_themes_2026.cjs');
  }
}

main();
