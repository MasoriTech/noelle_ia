#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.11c-config-premium-robust-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_11c_config_premium_robust_${STAMP}`);

const CSS_REF = 'src/styles/noelle_config_premium_v19_8_11c.css';
const JS_REF = 'src/renderer/noelle_config_premium_v19_8_11c.js';

function log(msg) { console.log(msg); }
function ok(msg) { log(`[OK] ${msg}`); }
function warn(msg) { log(`[AVISO] ${msg}`); }
function fail(msg) { log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, 'utf8');
}
function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok(`Backup: ${rel}`);
}

function verifyPackFiles() {
  [CSS_REF, JS_REF, 'iniciar.bat', 'scripts/repair_v19_8_11c_config_premium_robust_2026.cjs'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz do projeto.`);
  });
}

function removeOldTags(html) {
  let out = html;
  const patterns = [
    /\s*<link[^>]+noelle_config_premium_v19_8_11c\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_config_premium_v19_8_11c\.js[^>]*>\s*<\/script>\s*/gi,

    /\s*<link[^>]+noelle_settings_dashboard_v19_8_11b\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_settings_dashboard_v19_8_11b\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_settings_dashboard_v19_8_11a\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_settings_dashboard_v19_8_11a\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_settings_dashboard_v19_8_11\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_settings_dashboard_v19_8_11\.js[^>]*>\s*<\/script>\s*/gi,

    /\s*<script[^>]+noelle_theme_manager_v19_8_10a\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<script[^>]+noelle_theme_manager_v19_8_10\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_themes_v19_8_10\.css[^>]*>\s*/gi
  ];
  for (const pattern of patterns) out = out.replace(pattern, '\n');
  return out;
}

function patchControlsHtml() {
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    warn('src/controls.html não encontrado; pulando injeção.');
    return;
  }
  backup(rel);
  let html = read(rel);
  html = removeOldTags(html);

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_config_premium_v19_8_11c.css" data-noelle-config-premium-v19-8-11c="true">';
  const jsTag = '  <script src="./renderer/noelle_config_premium_v19_8_11c.js" defer data-noelle-config-premium-v19-8-11c="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${cssTag}\n</head>`);
  else html = `${cssTag}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${jsTag}\n</body>`);
  else html += `\n${jsTag}\n`;

  html = html.replace(/Abrir avatar/g, 'Abrir Widget');
  html = html.replace(/O INICIAR\.bat instala STT\/TTS[^<\n]*/gi, 'O iniciar.bat opção [1] apenas inicia. Use Configurações para testar TTS, STT e Ollama.');
  html = html.replace(/INICIAR\.bat/g, 'iniciar.bat');

  write(rel, html);
  ok('src/controls.html atualizado para Configurações Premium V19.8.11c.');
}

function patchPackageJson() {
  const rel = 'package.json';
  if (!exists(rel)) {
    warn('package.json não encontrado; pulando atualização.');
    return;
  }
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (err) { fail(`package.json inválido: ${err.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.11c-config'] = 'node scripts/repair_v19_8_11c_config_premium_robust_2026.cjs';
  pkg.scripts['diagnostico:v19.8.11c-config'] = 'node scripts/diagnostico_v19_8_11c_config_premium_robust_2026.cjs';
  pkg.scripts['status:v19.8.11c-config'] = 'node scripts/status_v19_8_11c_config_premium_robust_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory() {
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) {
    warn('MEMORIA_GPT_NOELLE.md não encontrado; pulando nota.');
    return;
  }
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.11c — Configurações Premium Robusta')) {
    md += `\n\n## V19.8.11c — Configurações Premium Robusta\n\n- Reforço da aba Configurações para evitar tela vazia.\n- Runtime único: \`noelle_config_premium_v19_8_11c.js\`.\n- Remove referências antigas V19.8.10/V19.8.11/V19.8.11a/V19.8.11b antes de instalar o novo runtime.\n- Bloqueia visualmente \`Avatar Lab\` e \`Room V19\` legados.\n- Mantém Yoru Ember como tema principal e preserva Chat, Avatar, Room, Widget, VRM, VRMA, PNG e GLB.\n- \`iniciar.bat\` permanece único; opção [1] apenas inicia.\n`;
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.11c.');
  } else {
    ok('MEMORIA_GPT_NOELLE.md já contém nota V19.8.11c.');
  }
}

function writeSchema() {
  const rel = 'data/noelle_config_premium_v19_8_11c.json';
  backup(rel);
  const schema = {
    version: VERSION,
    defaultTheme: 'yoru-ember',
    density: ['compacta', 'normal', 'confortavel'],
    cards: ['Temas', 'Aparência', 'IA / Ollama', 'Avatar', 'Áudio', 'Sistema'],
    safeStart: 'iniciar.bat opção [1] apenas inicia'
  };
  write(rel, JSON.stringify(schema, null, 2) + '\n');
  ok('data/noelle_config_premium_v19_8_11c.json criado/atualizado.');
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.11c - Configurações Premium Robusta');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  verifyPackFiles();
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  writeSchema();
  if (process.exitCode) {
    fail('Reparo V19.8.11c terminou com problemas.');
  } else {
    ok(`Reparo V19.8.11c concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode: node scripts\\diagnostico_v19_8_11c_config_premium_robust_2026.cjs');
  }
}

main();
