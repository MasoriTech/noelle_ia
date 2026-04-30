#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.20-avatar-compact-import-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', 'v19_8_20_avatar_compact_import_' + STAMP);

const CSS = 'src/styles/noelle_avatar_compact_import_v19_8_20.css';
const JS = 'src/renderer/noelle_avatar_compact_import_v19_8_20.js';

const MAIN_BEGIN = '// NOELLE_V19_8_20_IMPORT_MAIN_BEGIN';
const MAIN_END = '// NOELLE_V19_8_20_IMPORT_MAIN_END';
const PRELOAD_BEGIN = '// NOELLE_V19_8_20_IMPORT_PRELOAD_BEGIN';
const PRELOAD_END = '// NOELLE_V19_8_20_IMPORT_PRELOAD_END';

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

  html = html.replace(/\s*<link[^>]+noelle_avatar_compact_import_v19_8_20\.css[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<script[^>]+noelle_avatar_compact_import_v19_8_20\.js[^>]*>\s*<\/script>\s*/gi, '\n');

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_avatar_compact_import_v19_8_20.css" data-noelle-avatar-compact-import-v19-8-20="true">';
  const jsTag = '  <script src="./renderer/noelle_avatar_compact_import_v19_8_20.js" defer data-noelle-avatar-compact-import-v19-8-20="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, cssTag + '\n</head>');
  else html = cssTag + '\n' + html;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, jsTag + '\n</body>');
  else html = html + '\n' + jsTag + '\n';

  write(rel, html);
  ok('src/controls.html atualizado com compact/import V19.8.20.');
}

function patchMainJs(){
  const rel = 'main.js';
  if (!exists(rel)) {
    warn('main.js não encontrado; botão Importar aparecerá, mas API de importação pode ficar indisponível.');
    return;
  }

  backup(rel);
  let content = read(rel);

  const block = [
    MAIN_BEGIN,
    'try {',
    '  const { ipcMain, dialog, app } = require("electron");',
    '  const fs = require("fs");',
    '  const path = require("path");',
    '',
    '  if (!global.__NOELLE_V19_8_20_IMPORT_AVATAR__) {',
    '    global.__NOELLE_V19_8_20_IMPORT_AVATAR__ = true;',
    '',
    '    function noelleV19820ProjectRoot() {',
    '      const candidates = [',
    '        process.cwd(),',
    '        app && typeof app.getAppPath === "function" ? app.getAppPath() : "",',
    '        __dirname',
    '      ].filter(Boolean);',
    '',
    '      for (const candidate of candidates) {',
    '        try {',
    '          if (fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "src"))) {',
    '            return candidate;',
    '          }',
    '        } catch (_) {}',
    '      }',
    '',
    '      return process.cwd();',
    '    }',
    '',
    '    function noelleV19820SafeName(name) {',
    '      return String(name || "avatar")',
    '        .normalize("NFD").replace(/[\\\\u0300-\\\\u036f]/g, "")',
    '        .replace(/[^a-zA-Z0-9._-]+/g, "_")',
    '        .replace(/^_+|_+$/g, "")',
    '        .slice(0, 80) || "avatar";',
    '    }',
    '',
    '    function noelleV19820ReadJson(file, fallback) {',
    '      try {',
    '        if (!fs.existsSync(file)) return fallback;',
    '        return JSON.parse(fs.readFileSync(file, "utf8"));',
    '      } catch (_) {',
    '        return fallback;',
    '      }',
    '    }',
    '',
    '    function noelleV19820WriteManifest(root, relPath, displayName, ext) {',
    '      const manifestPath = path.join(root, "src", "assets", "avatar_manifest.json");',
    '      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });',
    '',
    '      const current = noelleV19820ReadJson(manifestPath, []);',
    '      const entryObject = {',
    '        name: displayName,',
    '        path: relPath,',
    '        file: relPath,',
    '        type: ext.replace(/^\\\\./, "").toUpperCase()',
    '      };',
    '',
    '      let next = current;',
    '',
    '      if (Array.isArray(current)) {',
    '        const hasStringStyle = current.some((item) => typeof item === "string");',
    '        const existsAlready = current.some((item) => {',
    '          if (typeof item === "string") return item.replace(/\\\\\\\\/g, "/") === relPath;',
    '          const p = String(item.path || item.file || item.url || "").replace(/\\\\\\\\/g, "/");',
    '          return p === relPath;',
    '        });',
    '',
    '        if (!existsAlready) next = current.concat([hasStringStyle ? relPath : entryObject]);',
    '      } else if (current && typeof current === "object" && Array.isArray(current.avatars)) {',
    '        const existsAlready = current.avatars.some((item) => {',
    '          if (typeof item === "string") return item.replace(/\\\\\\\\/g, "/") === relPath;',
    '          const p = String(item.path || item.file || item.url || "").replace(/\\\\\\\\/g, "/");',
    '          return p === relPath;',
    '        });',
    '        if (!existsAlready) {',
    '          next = Object.assign({}, current, { avatars: current.avatars.concat([entryObject]) });',
    '        }',
    '      } else {',
    '        next = [entryObject];',
    '      }',
    '',
    '      fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + "\\\\n", "utf8");',
    '      return {',
    '        manifestPath,',
    '        count: Array.isArray(next) ? next.length : (Array.isArray(next.avatars) ? next.avatars.length : 1)',
    '      };',
    '    }',
    '',
    '    ipcMain.handle("noelle:v19_8_20:import-avatar", async () => {',
    '      try {',
    '        const result = await dialog.showOpenDialog({',
    '          title: "Importar avatar VRM/GLB",',
    '          properties: ["openFile"],',
    '          filters: [',
    '            { name: "Avatares VRM/GLB", extensions: ["vrm", "glb"] }',
    '          ]',
    '        });',
    '',
    '        if (result.canceled || !result.filePaths || !result.filePaths[0]) {',
    '          return { ok: true, canceled: true };',
    '        }',
    '',
    '        const source = result.filePaths[0];',
    '        const ext = path.extname(source).toLowerCase();',
    '',
    '        if (![".vrm", ".glb"].includes(ext)) {',
    '          return { ok: false, error: "Escolha um arquivo .vrm ou .glb." };',
    '        }',
    '',
    '        const root = noelleV19820ProjectRoot();',
    '        const avatarDir = path.join(root, "src", "assets", "avatars");',
    '        fs.mkdirSync(avatarDir, { recursive: true });',
    '',
    '        const base = noelleV19820SafeName(path.basename(source, ext));',
    '        let fileName = base + ext;',
    '        let dest = path.join(avatarDir, fileName);',
    '        let index = 2;',
    '',
    '        while (fs.existsSync(dest)) {',
    '          fileName = base + "_" + index + ext;',
    '          dest = path.join(avatarDir, fileName);',
    '          index += 1;',
    '        }',
    '',
    '        fs.copyFileSync(source, dest);',
    '',
    '        const relPath = path.relative(path.join(root, "src"), dest).replace(/\\\\\\\\/g, "/");',
    '        const publicRelPath = "assets/" + relPath.replace(/^assets\\//, "");',
    '        const manifest = noelleV19820WriteManifest(root, publicRelPath, base, ext);',
    '',
    '        return {',
    '          ok: true,',
    '          canceled: false,',
    '          name: base,',
    '          path: publicRelPath,',
    '          destination: dest,',
    '          manifestCount: manifest.count',
    '        };',
    '      } catch (err) {',
    '        return { ok: false, error: err && err.message ? err.message : String(err) };',
    '      }',
    '    });',
    '  }',
    '} catch (err) {',
    '  console.warn("[Noelle V19.8.20] Import avatar IPC indisponível:", err && err.message ? err.message : err);',
    '}',
    MAIN_END
  ].join('\n');

  content = replaceBlock(content, MAIN_BEGIN, MAIN_END, block);
  write(rel, content);
  ok('main.js atualizado com IPC de importar avatar.');
}

function patchPreload(){
  const rel = 'preload.js';
  if (!exists(rel)) {
    warn('preload.js não encontrado; botão Importar aparecerá, mas API de importação pode ficar indisponível.');
    return;
  }

  backup(rel);
  let content = read(rel);

  const block = [
    PRELOAD_BEGIN,
    'try {',
    '  const { contextBridge, ipcRenderer } = require("electron");',
    '  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_V19_8_20_PRELOAD__) {',
    '    globalThis.__NOELLE_V19_8_20_PRELOAD__ = true;',
    '    contextBridge.exposeInMainWorld("noelleAvatarImportV19820", {',
    '      importAvatar: () => ipcRenderer.invoke("noelle:v19_8_20:import-avatar")',
    '    });',
    '  }',
    '} catch (err) {',
    '  console.warn("[Noelle V19.8.20] preload import avatar indisponível:", err && err.message ? err.message : err);',
    '}',
    PRELOAD_END
  ].join('\n');

  content = replaceBlock(content, PRELOAD_BEGIN, PRELOAD_END, block);
  write(rel, content);
  ok('preload.js atualizado com API noelleAvatarImportV19820.');
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
  pkg.scripts['repair:v19.8.20-avatar-compact-import'] = 'node scripts/repair_v19_8_20_avatar_compact_import_2026.cjs';
  pkg.scripts['diagnostico:v19.8.20-avatar-compact-import'] = 'node scripts/diagnostico_v19_8_20_avatar_compact_import_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json atualizado para ' + VERSION + '.');
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.20 — Avatar compacto + importar')) {
    md += '\n\n## V19.8.20 — Avatar compacto + importar\n\n- Microfix para reduzir a altura do card do Avatar, sem mexer na câmera 3D.\n- Adiciona botão **Importar avatar** na aba Avatar.\n- Adiciona botão **Acionar avatar** para salvar/acionar o avatar atual pela própria aba.\n- Importação copia `.vrm`/`.glb` para `src/assets/avatars` e atualiza `src/assets/avatar_manifest.json`.\n- Não usa MutationObserver e não remove DOM.\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.20 - Avatar compacto + importar avatar');
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

  if (process.exitCode) fail('Reparo V19.8.20 terminou com problemas.');
  else {
    ok('Reparo V19.8.20 concluído. Backup: ' + path.relative(ROOT, BACKUP_DIR));
    log('[INFO] Rode o diagnóstico e abra pela opção [1].');
  }
}

main();
