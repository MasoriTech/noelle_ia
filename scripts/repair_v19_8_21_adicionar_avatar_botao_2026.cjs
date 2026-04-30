#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.21-adicionar-avatar-botao-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', 'v19_8_21_adicionar_avatar_botao_' + STAMP);

const CSS = 'src/styles/noelle_add_avatar_button_v19_8_21.css';
const JS = 'src/renderer/noelle_add_avatar_button_v19_8_21.js';

const MAIN_BEGIN = '// NOELLE_V19_8_21_IMPORT_MAIN_BEGIN';
const MAIN_END = '// NOELLE_V19_8_21_IMPORT_MAIN_END';
const PRELOAD_BEGIN = '// NOELLE_V19_8_21_IMPORT_PRELOAD_BEGIN';
const PRELOAD_END = '// NOELLE_V19_8_21_IMPORT_PRELOAD_END';

function log(msg){ console.log(msg); }
function ok(msg){ log('[OK] ' + msg); }
function warn(msg){ log('[AVISO] ' + msg); }
function fail(msg){ log('[ERRO] ' + msg); process.exitCode = 1; }

function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, content){ fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), content, 'utf8'); }

function backup(rel){
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok('Backup: ' + rel);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceBlock(content, begin, end, block){
  const re = new RegExp(escapeRegExp(begin) + '[\\s\\S]*?' + escapeRegExp(end), 'g');
  if (re.test(content)) return content.replace(re, block);
  return content.trimEnd() + '\n\n' + block + '\n';
}

function patchControlsHtml(){
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    fail('src/controls.html não encontrado.');
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<link[^>]+noelle_add_avatar_button_v19_8_21\.css[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<script[^>]+noelle_add_avatar_button_v19_8_21\.js[^>]*>\s*<\/script>\s*/gi, '\n');

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_add_avatar_button_v19_8_21.css" data-noelle-add-avatar-v19-8-21="true">';
  const jsTag = '  <script src="./renderer/noelle_add_avatar_button_v19_8_21.js" defer data-noelle-add-avatar-v19-8-21="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, cssTag + '\n</head>');
  else html = cssTag + '\n' + html;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, jsTag + '\n</body>');
  else html = html + '\n' + jsTag + '\n';

  write(rel, html);
  ok('src/controls.html atualizado com botão Adicionar avatar V19.8.21.');
}

function patchMainJs(){
  const rel = 'main.js';
  if (!exists(rel)) {
    warn('main.js não encontrado; botão aparecerá, mas a importação pode ficar indisponível.');
    return;
  }

  backup(rel);
  let content = read(rel);

  const block = [
    MAIN_BEGIN,
    ';(() => {',
    '  try {',
    '    const electron = require("electron");',
    '    const ipcMain = electron.ipcMain;',
    '    const dialog = electron.dialog;',
    '    const app = electron.app;',
    '    const fs = require("fs");',
    '    const path = require("path");',
    '',
    '    if (!ipcMain || !dialog || global.__NOELLE_V19_8_21_IMPORT_AVATAR__) return;',
    '    global.__NOELLE_V19_8_21_IMPORT_AVATAR__ = true;',
    '',
    '    function projectRoot() {',
    '      const candidates = [process.cwd(), app && app.getAppPath ? app.getAppPath() : "", __dirname].filter(Boolean);',
    '      for (const candidate of candidates) {',
    '        try {',
    '          if (fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "src"))) return candidate;',
    '        } catch (_) {}',
    '      }',
    '      return process.cwd();',
    '    }',
    '',
    '    function safeName(name) {',
    '      return String(name || "avatar")',
    '        .normalize("NFD").replace(/[\\\\u0300-\\\\u036f]/g, "")',
    '        .replace(/[^a-zA-Z0-9._-]+/g, "_")',
    '        .replace(/^_+|_+$/g, "")',
    '        .slice(0, 90) || "avatar";',
    '    }',
    '',
    '    function readJson(file, fallback) {',
    '      try {',
    '        if (!fs.existsSync(file)) return fallback;',
    '        return JSON.parse(fs.readFileSync(file, "utf8"));',
    '      } catch (_) {',
    '        return fallback;',
    '      }',
    '    }',
    '',
    '    function writeManifest(root, relPath, name, ext) {',
    '      const manifestPath = path.join(root, "src", "assets", "avatar_manifest.json");',
    '      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });',
    '      const current = readJson(manifestPath, []);',
    '      const entry = { name: name, path: relPath, file: relPath, type: ext.replace(/^\\\\./, "").toUpperCase() };',
    '      let next = current;',
    '',
    '      if (Array.isArray(current)) {',
    '        const useString = current.some((item) => typeof item === "string");',
    '        const already = current.some((item) => {',
    '          if (typeof item === "string") return item.replace(/\\\\\\\\/g, "/") === relPath;',
    '          const p = String(item.path || item.file || item.url || "").replace(/\\\\\\\\/g, "/");',
    '          return p === relPath;',
    '        });',
    '        if (!already) next = current.concat([useString ? relPath : entry]);',
    '      } else if (current && typeof current === "object" && Array.isArray(current.avatars)) {',
    '        const already = current.avatars.some((item) => {',
    '          if (typeof item === "string") return item.replace(/\\\\\\\\/g, "/") === relPath;',
    '          const p = String(item.path || item.file || item.url || "").replace(/\\\\\\\\/g, "/");',
    '          return p === relPath;',
    '        });',
    '        if (!already) next = Object.assign({}, current, { avatars: current.avatars.concat([entry]) });',
    '      } else {',
    '        next = [entry];',
    '      }',
    '',
    '      fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + "\\\\n", "utf8");',
    '      return Array.isArray(next) ? next.length : (Array.isArray(next.avatars) ? next.avatars.length : 1);',
    '    }',
    '',
    '    ipcMain.handle("noelle:v19_8_21:import-avatar", async () => {',
    '      try {',
    '        const chosen = await dialog.showOpenDialog({',
    '          title: "Adicionar avatar VRM/GLB",',
    '          properties: ["openFile"],',
    '          filters: [{ name: "Avatares VRM/GLB", extensions: ["vrm", "glb"] }]',
    '        });',
    '',
    '        if (chosen.canceled || !chosen.filePaths || !chosen.filePaths[0]) return { ok: true, canceled: true };',
    '',
    '        const source = chosen.filePaths[0];',
    '        const ext = path.extname(source).toLowerCase();',
    '        if (ext !== ".vrm" && ext !== ".glb") return { ok: false, error: "Escolha um arquivo .vrm ou .glb." };',
    '',
    '        const root = projectRoot();',
    '        const avatarDir = path.join(root, "src", "assets", "avatars");',
    '        fs.mkdirSync(avatarDir, { recursive: true });',
    '',
    '        const base = safeName(path.basename(source, ext));',
    '        let fileName = base + ext;',
    '        let dest = path.join(avatarDir, fileName);',
    '        let n = 2;',
    '        while (fs.existsSync(dest)) {',
    '          fileName = base + "_" + n + ext;',
    '          dest = path.join(avatarDir, fileName);',
    '          n += 1;',
    '        }',
    '',
    '        fs.copyFileSync(source, dest);',
    '        const relFromSrc = path.relative(path.join(root, "src"), dest).replace(/\\\\\\\\/g, "/");',
    '        const publicRel = "assets/" + relFromSrc.replace(/^assets\\//, "");',
    '        const count = writeManifest(root, publicRel, base, ext);',
    '',
    '        return { ok: true, canceled: false, name: base, path: publicRel, destination: dest, manifestCount: count };',
    '      } catch (err) {',
    '        return { ok: false, error: err && err.message ? err.message : String(err) };',
    '      }',
    '    });',
    '  } catch (err) {',
    '    console.warn("[Noelle V19.8.21] Import avatar IPC indisponível:", err && err.message ? err.message : err);',
    '  }',
    '})();',
    MAIN_END
  ].join('\n');

  content = replaceBlock(content, MAIN_BEGIN, MAIN_END, block);
  write(rel, content);
  ok('main.js atualizado com IPC V19.8.21 de adicionar avatar.');
}

function patchPreload(){
  const rel = 'preload.js';
  if (!exists(rel)) {
    warn('preload.js não encontrado; botão aparecerá, mas a importação pode ficar indisponível.');
    return;
  }

  backup(rel);
  let content = read(rel);

  const block = [
    PRELOAD_BEGIN,
    'try {',
    '  const electron = require("electron");',
    '  const contextBridge = electron.contextBridge;',
    '  const ipcRenderer = electron.ipcRenderer;',
    '  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_V19_8_21_PRELOAD__) {',
    '    globalThis.__NOELLE_V19_8_21_PRELOAD__ = true;',
    '    contextBridge.exposeInMainWorld("noelleAvatarImportV19821", {',
    '      importAvatar: () => ipcRenderer.invoke("noelle:v19_8_21:import-avatar")',
    '    });',
    '  }',
    '} catch (err) {',
    '  console.warn("[Noelle V19.8.21] preload import avatar indisponível:", err && err.message ? err.message : err);',
    '}',
    PRELOAD_END
  ].join('\n');

  content = replaceBlock(content, PRELOAD_BEGIN, PRELOAD_END, block);
  write(rel, content);
  ok('preload.js atualizado com API noelleAvatarImportV19821.');
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) return;

  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (e) { fail('package.json inválido: ' + e.message); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.21-add-avatar-button'] = 'node scripts/repair_v19_8_21_adicionar_avatar_botao_2026.cjs';
  pkg.scripts['diagnostico:v19.8.21-add-avatar-button'] = 'node scripts/diagnostico_v19_8_21_adicionar_avatar_botao_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json atualizado para ' + VERSION + '.');
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.21 — Botão Adicionar avatar')) {
    md += '\n\n## V19.8.21 — Botão Adicionar avatar\n\n- Adiciona botão **Adicionar avatar** na aba Avatar, perto de `Recarregar lista`/ações do avatar.\n- O botão abre seletor `.vrm`/`.glb`, copia para `src/assets/avatars` e atualiza `src/assets/avatar_manifest.json`.\n- Depois tenta clicar em `Recarregar lista` automaticamente.\n- Micro-patch sem observador de DOM, sem remover containers e sem mexer no renderer 3D.\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.21 - Botão Adicionar avatar');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [CSS, JS, 'iniciar.bat'].forEach((rel) => {
    if (exists(rel)) ok(rel + ' existe');
    else fail(rel + ' não encontrado. Copie o pack inteiro para a raiz.');
  });

  patchControlsHtml();
  patchMainJs();
  patchPreload();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.21 terminou com problemas.');
  else {
    ok('Reparo V19.8.21 concluído. Backup: ' + path.relative(ROOT, BACKUP_DIR));
    log('[INFO] Rode o diagnóstico e abra pela opção [1].');
  }
}

main();
