#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.18-avatar-fit-viewport-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_18_avatar_fit_viewport_${STAMP}`);

const CSS = 'src/styles/noelle_avatar_fit_viewport_v19_8_18.css';
const JS = 'src/renderer/noelle_avatar_fit_viewport_v19_8_18.js';

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function fail(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, content){ fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), content, 'utf8'); }

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
    fail('src/controls.html não encontrado.');
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<link[^>]+noelle_avatar_fit_viewport_v19_8_18\.css[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<script[^>]+noelle_avatar_fit_viewport_v19_8_18\.js[^>]*>\s*<\/script>\s*/gi, '\n');

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_avatar_fit_viewport_v19_8_18.css" data-noelle-avatar-fit-v19-8-18="true">';
  const jsTag = '  <script src="./renderer/noelle_avatar_fit_viewport_v19_8_18.js" defer data-noelle-avatar-fit-v19-8-18="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${cssTag}\n</head>`);
  else html = `${cssTag}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${jsTag}\n</body>`);
  else html = `${html}\n${jsTag}\n`;

  write(rel, html);
  ok('src/controls.html atualizado com fit viewport V19.8.18.');
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) return;
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (e) { fail(`package.json inválido: ${e.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.18-avatar-fit'] = 'node scripts/repair_v19_8_18_avatar_fit_viewport_2026.cjs';
  pkg.scripts['diagnostico:v19.8.18-avatar-fit'] = 'node scripts/diagnostico_v19_8_18_avatar_fit_viewport_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.18 — Avatar fit viewport')) {
    md += '\n\n## V19.8.18 — Avatar fit viewport\n\n- Microfix para a aba Avatar caber verticalmente na janela atual.\\n- O problema corrigido é layout/altura da página, não câmera 3D.\\n- Preview fica limitado ao viewport e painel lateral rola por dentro se necessário.\\n- Não mexe em Chat, Room, Configurações ou assets.\\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.18 - Avatar fit viewport');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [CSS, JS, 'iniciar.bat'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz.`);
  });

  patchControlsHtml();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.18 terminou com problemas.');
  else {
    ok(`Reparo V19.8.18 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e abra pela opção [1].');
  }
}

main();
