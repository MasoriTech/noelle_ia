#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.11a-configuracoes-premium-reforco-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_11a_config_premium_reforco_${STAMP}`);

const CSS_REF = 'src/styles/noelle_settings_dashboard_v19_8_11a.css';
const JS_REF = 'src/renderer/noelle_settings_dashboard_v19_8_11a.js';

function log(s) { console.log(s); }
function ok(s) { log(`[OK] ${s}`); }
function warn(s) { log(`[AVISO] ${s}`); }
function fail(s) { log(`[ERRO] ${s}`); process.exitCode = 1; }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, data) { fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), data, 'utf8'); }
function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok(`Backup: ${rel}`);
}

function removeOldTags(html) {
  const patterns = [
    /\s*<link[^>]+noelle_settings_dashboard_v19_8_11a\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_settings_dashboard_v19_8_11a\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_settings_dashboard_v19_8_11\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_settings_dashboard_v19_8_11\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_themes_v19_8_10\.css[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_theme_manager_v19_8_10a\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<script[^>]+noelle_theme_manager_v19_8_10\.js[^>]*>\s*<\/script>\s*/gi,
    /\s*<link[^>]+noelle_ui_polish_v19_8_9[^>]*>\s*/gi,
    /\s*<script[^>]+noelle_ui_polish_v19_8_9[^>]*>\s*<\/script>\s*/gi
  ];
  let out = html;
  for (const p of patterns) out = out.replace(p, '\n');
  return out;
}

function patchControlsHtml() {
  const rel = 'src/controls.html';
  if (!exists(rel)) { warn('src/controls.html não encontrado; pulando injeção.'); return; }
  backup(rel);
  let html = removeOldTags(read(rel));

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_settings_dashboard_v19_8_11a.css" data-noelle-settings-v19-8-11a="true">';
  const jsTag = '  <script src="./renderer/noelle_settings_dashboard_v19_8_11a.js" defer data-noelle-settings-v19-8-11a="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${cssTag}\n</head>`);
  else html = `${cssTag}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${jsTag}\n</body>`);
  else html = `${html}\n${jsTag}\n`;

  html = html.replace(/Abrir avatar/g, 'Abrir Widget');
  html = html.replace(/O INICIAR\.bat instala STT\/TTS[^<\n]*/gi, 'O iniciar.bat agora inicia limpo. Use Configurações para testar áudio, IA e avatar.');
  html = html.replace(/INICIAR\.bat/g, 'iniciar.bat');

  write(rel, html);
  ok('src/controls.html atualizado com Configurações Premium Reforço V19.8.11a.');
}

function patchPackageJson() {
  const rel = 'package.json';
  if (!exists(rel)) { warn('package.json não encontrado; pulando.'); return; }
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); } catch (e) { fail(`package.json inválido: ${e.message}`); return; }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.11a-config'] = 'node scripts/repair_v19_8_11a_configuracoes_premium_reforco_2026.cjs';
  pkg.scripts['diagnostico:v19.8.11a-config'] = 'node scripts/diagnostico_v19_8_11a_configuracoes_premium_reforco_2026.cjs';
  pkg.scripts['status:v19.8.11a-config'] = 'node scripts/status_v19_8_11a_configuracoes_premium_reforco_2026.cjs';
  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory() {
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) { warn('MEMORIA_GPT_NOELLE.md não encontrado; pulando nota.'); return; }
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.11a — Configurações Premium Reforço')) {
    md += `\n\n## V19.8.11a — Configurações Premium Reforço 2026\n\n- Aba Configurações deve usar o dashboard V19.8.11a.\n- O card chamado **Interface** não deve voltar; usar **Aparência** para densidade/layout.\n- Manter Yoru Ember como tema padrão, sem reativar Avatar Lab / Room V19.\n- Reforçar idempotência: não duplicar painel, não criar overlay, não mexer em assets VRM/VRMA/PNG/GLB.\n- \`iniciar.bat\` continua único; opção [1] apenas inicia o programa.\n`;
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.11a.');
  } else ok('MEMORIA_GPT_NOELLE.md já contém nota V19.8.11a.');
}

function writeSettingsSchema() {
  const rel = 'data/noelle_settings_schema_v19_8_11a.json';
  backup(rel);
  const data = {
    version: VERSION,
    defaultTheme: 'yoru-ember',
    cards: ['Temas', 'Aparência', 'IA / Ollama', 'Avatar', 'Áudio', 'Sistema'],
    removedLegacyCards: ['Interface', 'Tema e interface', 'Áudio essencial'],
    density: ['compacta', 'normal', 'confortavel'],
    defaultAvatarMode: ['widget', 'room', 'preview']
  };
  write(rel, JSON.stringify(data, null, 2) + '\n');
  ok('data/noelle_settings_schema_v19_8_11a.json criado/atualizado.');
}

function verifyPackFiles() {
  [CSS_REF, JS_REF, 'iniciar.bat'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz.`);
  });
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.11a - Configurações Premium Reforço');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  verifyPackFiles();
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  writeSettingsSchema();

  if (process.exitCode) fail('Reparo V19.8.11a terminou com problemas.');
  else {
    ok(`Reparo V19.8.11a concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode: node scripts\\diagnostico_v19_8_11a_configuracoes_premium_reforco_2026.cjs');
  }
}

main();
