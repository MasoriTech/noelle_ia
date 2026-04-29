#!/usr/bin/env node
/* Diagnóstico V19.8.1c - valida preload limpo + manifest array com arquivos existentes. */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');
let failures = 0;

function ok(msg) { console.log(`[OK] ${msg}`); }
function err(msg) { console.error(`[ERRO] ${msg}`); failures += 1; }
function warn(msg) { console.warn(`[AVISO] ${msg}`); }
function exists(p) { try { return fs.existsSync(p); } catch (_) { return false; } }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function norm(s) { return String(s || '').replace(/\\/g, '/').replace(/^\.\//, ''); }

function nodeCheck(rel) {
  const file = path.join(ROOT, rel);
  if (!exists(file)) { err(`arquivo ausente: ${rel}`); return; }
  try {
    cp.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok(`node --check ${rel}`);
  } catch (e) {
    err(`node --check falhou: ${rel}`);
    const out = String(e.stderr || e.stdout || e.message || '');
    if (out.trim()) console.error(out.trim());
  }
}

function resolveEntry(entry) {
  const candidates = [];
  for (const key of ['path', 'rel', 'url', 'file', 'src']) {
    if (entry && typeof entry[key] === 'string' && entry[key].trim()) {
      let s = norm(entry[key].trim()).split('?')[0].split('#')[0];
      candidates.push(path.join(ROOT, s));
      candidates.push(path.join(ROOT, 'src', s));
      candidates.push(path.join(ROOT, 'public', s));
    }
  }
  for (const c of candidates) {
    if (exists(c)) return c;
  }
  return null;
}

function checkNoLegacy(rel, terms) {
  const file = path.join(ROOT, rel);
  if (!exists(file)) { warn(`${rel} ausente; pulando legado`); return; }
  const text = read(file);
  for (const t of terms) {
    if (text.includes(t)) err(`${rel} ainda contém legado: ${t}`);
    else ok(`${rel} sem legado: ${t}`);
  }
}

function main() {
  console.log('================================================================');
  console.log(' Noelle V19.8.1c - diagnóstico Manifest Normalizer');
  console.log('================================================================');

  nodeCheck('preload.js');
  nodeCheck('scripts/repair_v19_8_1c_manifest_normalizer_2026.cjs');
  nodeCheck('scripts/diagnostico_v19_8_1c_manifest_normalizer_2026.cjs');

  const preload = path.join(ROOT, 'preload.js');
  if (exists(preload)) {
    const text = read(preload);
    for (const api of [
      'contextBridge.exposeInMainWorld("noelleAPI"',
      'contextBridge.exposeInMainWorld("desktopWidget"',
      'contextBridge.exposeInMainWorld("noelleRoom"',
      'contextBridge.exposeInMainWorld("noelleRoomV19"'
    ]) {
      if (text.includes(api)) ok(`preload.js contém: ${api}`);
      else err(`preload.js não contém API esperada: ${api}`);
    }
  }

  checkNoLegacy('preload.js', [
    'noelle-v19-5-avatar-panel-script',
    'noelle-v19-3-complete-runtime-script',
    'avatar_v19_5_panel_bootstrap.js',
    'noelle_v19_3_complete_ui_md.js',
    'NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN',
    'NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN',
    'document.createElement("script")',
    'appendChild(script)'
  ]);

  checkNoLegacy('src/controls.html', [
    'avatar_v19_5_panel_bootstrap.js',
    'noelle_v19_3_complete_ui_md.js'
  ]);

  checkNoLegacy('iniciar.bat', [
    'Activate.ps1',
    'Set-ExecutionPolicy'
  ]);

  if (!exists(MANIFEST)) {
    err('src/assets/avatar_manifest.json não existe');
  } else {
    let parsed;
    try { parsed = JSON.parse(read(MANIFEST)); }
    catch (e) { err(`avatar_manifest.json não é JSON válido: ${e.message}`); }
    if (parsed !== undefined) {
      if (!Array.isArray(parsed)) {
        err('avatar_manifest.json existe, mas não é uma lista/array JSON');
      } else {
        ok('avatar_manifest.json é array JSON');
        if (parsed.length === 0) err('Manifest não contém nenhum VRM/GLB válido');
        else ok(`Manifest contém ${parsed.length} entrada(s)`);
        let valid = 0;
        for (const entry of parsed) {
          const abs = resolveEntry(entry);
          if (abs && /\.(vrm|glb)$/i.test(abs)) valid += 1;
        }
        if (valid === 0) err('Nenhum arquivo do manifest existe no disco');
        else ok(`${valid} arquivo(s) do manifest existem no disco`);
      }
    }
  }

  const pkg = path.join(ROOT, 'package.json');
  if (exists(pkg)) {
    try {
      const p = JSON.parse(read(pkg));
      if (String(p.version || '').includes('19.8.1c')) ok(`package.json version: ${p.version}`);
      else warn(`package.json version não é 19.8.1c: ${p.version || '(sem versão)'}`);
    } catch (e) { err(`package.json inválido: ${e.message}`); }
  }

  if (failures) {
    console.error(`\n[ERRO] Diagnóstico V19.8.1c encontrou ${failures} problema(s).`);
    process.exit(1);
  }
  console.log('\n[OK] Diagnóstico V19.8.1c aprovado.');
}

main();
