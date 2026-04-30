#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.6-overlay-launcher-killer-2026';
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_6_overlay_launcher_killer_${new Date().toISOString().replace(/[:.]/g, '-')}`);

function p(...parts) { return path.join(ROOT, ...parts); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
function log(msg) { console.log(msg); }
function ok(msg) { log(`[OK] ${msg}`); }
function warn(msg) { log(`[AVISO] ${msg}`); }

function backup(file) {
  if (!exists(file)) return;
  const dst = path.join(BACKUP_DIR, rel(file));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(file, dst);
  ok(`Backup: ${rel(file)} -> ${rel(dst)}`);
}

function copyFromPack(srcRel, dstRel) {
  const src = path.join(__dirname, '..', srcRel);
  const dst = p(dstRel);
  if (!exists(src)) throw new Error(`Arquivo do pack ausente: ${srcRel}`);
  backup(dst);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  ok(`Atualizado: ${dstRel}`);
}

function ensureStyleLink(html) {
  const href = './styles/noelle_overlay_killer_v19_8_6.css';
  if (html.includes(href)) return html;
  const tag = `  <link rel="stylesheet" href="${href}">\n`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tag}</head>`);
  return tag + html;
}

function stripOldGuards(html) {
  const oldPatterns = [
    /\s*<script\s+[^>]*src=["'][^"']*noelle_avatar_resize_guard_v19_8_3\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /\s*<script\s+[^>]*src=["'][^"']*noelle_avatar_route_guard_v19_8_4\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /\s*<script\s+[^>]*src=["'][^"']*noelle_avatar_overlay_killer_v19_8_5\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /\s*<script\s+[^>]*src=["'][^"']*avatar_v19_5_panel_bootstrap\.js[^"']*["'][^>]*><\/script>\s*/gi,
    /\s*<script\s+[^>]*src=["'][^"']*noelle_v19_3_complete_ui_md\.js[^"']*["'][^>]*><\/script>\s*/gi
  ];
  for (const re of oldPatterns) html = html.replace(re, '\n');
  return html;
}

function ensureOverlayScript(html) {
  const src = './renderer/noelle_overlay_killer_v19_8_6.js';
  if (html.includes(src)) return html;
  const tag = `  <script defer src="${src}"></script>\n`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`);
  return html + '\n' + tag;
}

function patchControlsHtml() {
  const file = p('src', 'controls.html');
  if (!exists(file)) {
    warn('src/controls.html não encontrado; pulando patch de HTML.');
    return;
  }
  backup(file);
  let html = read(file);
  html = stripOldGuards(html);
  html = ensureStyleLink(html);
  html = ensureOverlayScript(html);
  write(file, html);
  ok('src/controls.html atualizado com Overlay Killer V19.8.6.');
}

function patchPackageJson() {
  const file = p('package.json');
  if (!exists(file)) {
    warn('package.json não encontrado.');
    return;
  }
  backup(file);
  const pkg = JSON.parse(read(file));
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.6-overlay'] = 'node scripts/repair_v19_8_6_overlay_launcher_killer_2026.cjs';
  pkg.scripts['diagnostico:v19.8.6-overlay'] = 'node scripts/diagnostico_v19_8_6_overlay_launcher_killer_2026.cjs';
  pkg.scripts['status:v19.8.6-overlay'] = 'node scripts/status_v19_8_6_overlay_launcher_killer_2026.cjs';
  write(file, JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json atualizado para V19.8.6.');
}

function patchMemory() {
  const file = p('MEMORIA_GPT_NOELLE.md');
  if (!exists(file)) return;
  let md = read(file);
  if (md.includes('V19.8.6 Overlay Launcher Killer')) {
    ok('MEMORIA_GPT_NOELLE.md já contém nota V19.8.6.');
    return;
  }
  backup(file);
  md += `\n\n## V19.8.6 Overlay Launcher Killer\n- O botão/pílula flutuante legado \`Avatar Lab\` / \`Room V19\` não deve aparecer sobre a aba Avatar nem sobre outras abas.\n- A aba Avatar real continua preservada; o guard apenas remove launchers legados e impede overlay preso por cima de Principal/Chat/Configurações/Sobre.\n- \`preload.js\` continua limpo: sem injeção visual V19.3/V19.5 e mantendo apenas APIs seguras via contextBridge.\n- \`iniciar.bat\` permanece único; opção [1] apenas inicia o programa.\n`;
  write(file, md);
  ok('MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.6.');
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.6 Overlay Launcher Killer - reparo controlado');
  console.log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  copyFromPack('src/renderer/noelle_overlay_killer_v19_8_6.js', 'src/renderer/noelle_overlay_killer_v19_8_6.js');
  copyFromPack('src/styles/noelle_overlay_killer_v19_8_6.css', 'src/styles/noelle_overlay_killer_v19_8_6.css');
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  ok(`Reparo V19.8.6 concluído. Backup: ${rel(BACKUP_DIR)}`);
  console.log('[INFO] Rode: node scripts\\diagnostico_v19_8_6_overlay_launcher_killer_2026.cjs');
}

try {
  main();
} catch (err) {
  console.error('[ERRO]', err && err.stack ? err.stack : err);
  process.exit(1);
}
