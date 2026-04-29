#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const RENDERER = path.join(SRC, 'renderer');
const ASSETS = path.join(SRC, 'assets');
const VERSION = 'V19.7.8';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP = path.join(ROOT, 'backups', 'v19_7_8_avatar_final_layout_' + STAMP);

const packRoot = path.resolve(__dirname, '..');
const packSrc = path.join(packRoot, 'src');
const packScripts = path.join(packRoot, 'scripts');

function log(msg) { console.log(msg); }
function ok(msg) { log('[OK] ' + msg); }
function warn(msg) { log('[AVISO] ' + msg); }
function fail(msg) { console.error('[ERRO] ' + msg); process.exitCode = 1; }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { ensureDir(path.dirname(file)); fs.writeFileSync(file, text, 'utf8'); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }

function backupFile(file) {
  if (!exists(file)) return;
  const target = path.join(BACKUP, rel(file));
  ensureDir(path.dirname(target));
  fs.copyFileSync(file, target);
}

function copyPackFile(fromRel, toRel) {
  const from = path.join(packRoot, fromRel);
  const to = path.join(ROOT, toRel || fromRel);
  if (!exists(from)) {
    warn('Arquivo do pack não encontrado: ' + fromRel);
    return;
  }
  backupFile(to);
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  ok('Atualizado: ' + (toRel || fromRel));
}

function updatePackageJson() {
  const file = path.join(ROOT, 'package.json');
  if (!exists(file)) {
    warn('package.json não encontrado. Pulando scripts npm.');
    return;
  }
  backupFile(file);
  let data;
  try { data = JSON.parse(read(file)); }
  catch (err) { fail('package.json inválido: ' + err.message); return; }
  data.scripts = data.scripts || {};
  data.scripts['build:avatar-tab-v19.7.8'] = 'node scripts/build_avatar_tab_v19_7_8_2026.cjs';
  data.scripts['diagnostico:avatar-tab-v19.7.8'] = 'node scripts/diagnostico_avatar_layout_v19_7_8_2026.cjs';
  data.scripts['apply:avatar-tab-v19.7.8'] = 'node scripts/fix_avatar_layout_v19_7_8_2026.cjs --apply';
  data.scripts['diagnostico:avatar-tab'] = 'node scripts/diagnostico_avatar_layout_v19_7_8_2026.cjs';
  write(file, JSON.stringify(data, null, 2) + '\n');
  ok('package.json atualizado.');
}

function appendMemory() {
  const file = path.join(ROOT, 'MEMORIA_GPT_NOELLE.md');
  const note = [
    '',
    '## V19.7.8 - Avatar final limpo em carrossel',
    '- Aba Avatar deve ser limpa, sem BroadcastChannel/localStorage/Sincronizar Room na interface.',
    '- Layout correto: avatar grande à esquerda, opções à direita, setas embaixo.',
    '- Room / Quarto aplica cenário e objetos; Widget Mode abre avatar sem fundo; Preview/Teste fica na aba Avatar.',
    '- Manter um único iniciar.bat com menu e opção segura para mover outros .bat para backup.',
    ''
  ].join('\n');
  if (!exists(file)) {
    write(file, '# MEMORIA GPT NOELLE\n' + note);
    ok('MEMORIA_GPT_NOELLE.md criado.');
    return;
  }
  let text = read(file);
  if (text.includes('V19.7.8 - Avatar final limpo em carrossel')) {
    ok('MEMORIA_GPT_NOELLE.md já contém V19.7.8.');
    return;
  }
  backupFile(file);
  write(file, text.replace(/\s*$/, '') + '\n' + note);
  ok('MEMORIA_GPT_NOELLE.md atualizado.');
}

function disableLegacyBootstrap() {
  const legacy = path.join(RENDERER, 'avatar_v19_5_panel_bootstrap.js');
  backupFile(legacy);
  const stub = `'use strict';\n(() => {\n  if (window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__) return;\n  window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = true;\n  const inject = () => {\n    if (document.getElementById('noelle-avatar-tab-v1978-runtime-script')) return;\n    const script = document.createElement('script');\n    script.id = 'noelle-avatar-tab-v1978-runtime-script';\n    script.src = './renderer/noelle_avatar_tab_v19_7_8_runtime.js';\n    script.defer = true;\n    (document.head || document.documentElement).appendChild(script);\n  };\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);\n  else inject();\n})();\n`;
  write(legacy, stub);
  ok('Bootstrap antigo V19.5 substituído por redirecionamento limpo.');
}

function updatePreload() {
  const file = path.join(ROOT, 'preload.js');
  if (!exists(file)) {
    warn('preload.js não encontrado.');
    return;
  }
  backupFile(file);
  let text = read(file);
  text = text.split('./renderer/avatar_v19_5_panel_bootstrap.js').join('./renderer/noelle_avatar_tab_v19_7_8_runtime.js');
  if (!text.includes('NOELLE_AVATAR_TAB_V1978_PRELOAD_BEGIN')) {
    text += `\n// NOELLE_AVATAR_TAB_V1978_PRELOAD_BEGIN\n(() => {\n  try {\n    const inject = () => {\n      try {\n        if (document.getElementById('noelle-avatar-tab-v1978-runtime-script')) return;\n        const script = document.createElement('script');\n        script.id = 'noelle-avatar-tab-v1978-runtime-script';\n        script.src = './renderer/noelle_avatar_tab_v19_7_8_runtime.js';\n        script.defer = true;\n        (document.head || document.documentElement).appendChild(script);\n      } catch (err) { try { console.warn('[Noelle] Falha ao injetar Avatar V19.7.8', err); } catch {} }\n    };\n    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);\n    else inject();\n  } catch (err) { try { console.warn('[Noelle] preload Avatar V19.7.8 indisponível', err); } catch {} }\n})();\n// NOELLE_AVATAR_TAB_V1978_PRELOAD_END\n`;
  }
  write(file, text);
  ok('preload.js atualizado para runtime Avatar V19.7.8.');
}

function maybePatchMainWindowSize() {
  const file = path.join(ROOT, 'main.js');
  if (!exists(file)) return;
  backupFile(file);
  let text = read(file);
  const before = text;
  text = text.replace(/width:\s*1180/g, 'width: 1420');
  text = text.replace(/height:\s*760/g, 'height: 900');
  text = text.replace(/minWidth:\s*900/g, 'minWidth: 1180');
  text = text.replace(/minHeight:\s*620/g, 'minHeight: 760');
  if (text !== before) {
    write(file, text);
    ok('main.js ajustado para janela maior.');
  } else {
    ok('main.js mantido.');
  }
}

function generateAvatarManifest() {
  ensureDir(ASSETS);
  const manifest = path.join(ASSETS, 'avatar_manifest.json');
  backupFile(manifest);
  const roots = [
    path.join(SRC, 'assets'),
    path.join(ROOT, 'assets')
  ];
  const skip = new Set(['node_modules', '.git', 'release', 'dist', 'backups', '.venv', 'venv']);
  const found = [];
  function walk(dir) {
    if (!exists(dir)) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (skip.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(vrm|glb)$/i.test(ent.name)) found.push(p);
    }
  }
  roots.forEach(walk);
  const unique = Array.from(new Set(found.map((p) => path.resolve(p))));
  const avatars = unique.map((file, i) => {
    const name = path.basename(file).replace(/\.(vrm|glb)$/i, '').replace(/[_-]+/g, ' ').trim() || ('Avatar ' + (i + 1));
    let avatarFile;
    if (file.startsWith(SRC + path.sep)) avatarFile = path.relative(SRC, file);
    else avatarFile = path.relative(SRC, file);
    avatarFile = avatarFile.replace(/\\/g, '/');
    return { id: 'avatar_' + String(i + 1).padStart(2, '0'), name, file: avatarFile };
  });
  write(manifest, JSON.stringify({ version: '19.7.8', generatedAt: new Date().toISOString(), avatars }, null, 2) + '\n');
  ok('avatar_manifest.json gerado: ' + avatars.length + ' avatar(es).');
}

function copyFiles() {
  copyPackFile('src/avatar_carousel_preview_v19_7_8.html');
  copyPackFile('src/renderer/avatar_carousel_preview_v19_7_8_app.js');
  copyPackFile('src/renderer/noelle_avatar_tab_v19_7_8_runtime.js');
  copyPackFile('scripts/build_avatar_tab_v19_7_8_2026.cjs');
  copyPackFile('scripts/diagnostico_avatar_layout_v19_7_8_2026.cjs');
}

function main() {
  log('================================================================');
  log(' Noelle ' + VERSION + ' - correção final aba Avatar carrossel');
  log('================================================================');
  ensureDir(BACKUP);
  copyFiles();
  disableLegacyBootstrap();
  updatePreload();
  maybePatchMainWindowSize();
  generateAvatarManifest();
  updatePackageJson();
  appendMemory();
  ok('Correção V19.7.8 aplicada. Backup: ' + path.relative(ROOT, BACKUP));
}

main();
