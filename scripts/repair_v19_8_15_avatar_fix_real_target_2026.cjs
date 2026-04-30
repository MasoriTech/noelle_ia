#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.15-avatar-fix-real-target-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_15_avatar_fix_real_target_${STAMP}`);
const CSS_REF = 'src/styles/noelle_avatar_canvas_fix_v19_8_15.css';
const CSS_TOKEN = 'noelle_avatar_canvas_fix_v19_8_15.css';

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function fail(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }
function write(rel, content){ fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), content, 'utf8'); }
function rel(abs){ return path.relative(ROOT, abs).replace(/\\/g, '/'); }

function backup(relPath){
  if (!exists(relPath)) return;
  const dest = path.join(BACKUP_DIR, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(relPath), dest);
  ok(`Backup: ${relPath}`);
}

function walk(dir){
  const out = [];
  function visit(d){
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'backups', '.git', '.venv', 'release'].includes(entry.name)) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) visit(p);
      else out.push(p);
    }
  }
  visit(dir);
  return out;
}

function patchControlsCss(){
  const relPath = 'src/controls.html';
  if (!exists(relPath)) {
    warn('src/controls.html não encontrado; CSS não foi injetado.');
    return;
  }
  backup(relPath);
  let html = read(relPath);
  html = html.replace(new RegExp(`<link[^>]+${CSS_TOKEN}[^>]*>\\s*`, 'gi'), '\n');
  const tag = `  <link rel="stylesheet" href="./styles/${CSS_TOKEN}" data-noelle-avatar-fix-v19-8-15="true">`;
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${tag}\n</head>`);
  else html = `${tag}\n${html}`;
  write(relPath, html);
  ok('src/controls.html atualizado com CSS V19.8.15.');
}

function patchHtmlFiles(){
  const htmlFiles = [
    ...walk(full('src')).filter(p => /\.html$/i.test(p)),
  ];
  let touched = 0;
  for (const abs of htmlFiles) {
    const r = rel(abs);
    let html = fs.readFileSync(abs, 'utf8');
    if (!/avatar|vrm|preview|canvas/i.test(html + r)) continue;
    let out = html;
    out = out.replace(/background\s*:\s*(?:#fff|#ffffff|white)\s*;?/gi, 'background: transparent;');
    out = out.replace(/background-color\s*:\s*(?:#fff|#ffffff|white)\s*;?/gi, 'background-color: transparent;');
    if (out !== html) {
      backup(r);
      fs.writeFileSync(abs, out, 'utf8');
      ok(`HTML limpo de fundo branco: ${r}`);
      touched += 1;
    }
  }
  if (!touched) warn('Nenhum HTML com fundo branco óbvio foi alterado.');
}

function injectHelperInto(content){
  if (content.includes('noelleForceAvatarAPoseV19815')) return content;
  const helper = `
/* NOELLE_V19_8_15_AVATAR_FIX_BEGIN */
function noelleForceAvatarAPoseV19815(vrm, THREERef) {
  try {
    const THREE_SAFE = THREERef || (typeof THREE !== 'undefined' ? THREE : null);
    const humanoid = vrm && vrm.humanoid;
    if (!humanoid || !THREE_SAFE || !THREE_SAFE.MathUtils) return false;
    const getBone = humanoid.getNormalizedBoneNode
      ? (name) => humanoid.getNormalizedBoneNode(name)
      : (name) => (humanoid.getRawBoneNode ? humanoid.getRawBoneNode(name) : null);
    const rad = THREE_SAFE.MathUtils.degToRad || ((v) => v * Math.PI / 180);
    const set = (name, axis, deg) => {
      const b = getBone(name);
      if (b && b.rotation) b.rotation[axis] = rad(deg);
    };
    set('leftShoulder', 'z', 8);
    set('rightShoulder', 'z', -8);
    set('leftUpperArm', 'z', 22);
    set('rightUpperArm', 'z', -22);
    set('leftLowerArm', 'z', -4);
    set('rightLowerArm', 'z', 4);
    set('leftHand', 'z', -2);
    set('rightHand', 'z', 2);
    if (typeof vrm.update === 'function') vrm.update(0);
    return true;
  } catch (_) {
    return false;
  }
}
/* NOELLE_V19_8_15_AVATAR_FIX_END */
`;
  // after import block for modules, otherwise at top
  const importMatch = content.match(/^(?:\s*import[^\n]*\n)+/);
  if (importMatch) return content.replace(importMatch[0], importMatch[0] + helper + '\n');
  return helper + '\n' + content;
}

function patchJsContent(content){
  let out = content;
  let changed = false;
  const original = out;

  const isRelevant = /WebGLRenderer|VRM|three-vrm|GLTFLoader|avatar|vrm/i.test(out);
  if (!isRelevant) return { changed: false, content };

  // backgrounds hardcoded in JS/CSS strings
  out = out.replace(/(#ffffff|#fff|white)/gi, (m) => {
    changed = true;
    return 'transparent';
  });

  // WebGLRenderer object args: add alpha true when possible
  out = out.replace(/new\s+THREE\.WebGLRenderer\s*\(\s*\{([^}]*)\}\s*\)/g, (m, inner) => {
    if (/\balpha\s*:/.test(inner)) return m;
    changed = true;
    const trimmed = inner.trim();
    return `new THREE.WebGLRenderer({ ${trimmed ? trimmed + ', ' : ''}alpha: true })`;
  });

  // minified / imported object WebGLRenderer({ antialias:true }) without THREE prefix
  out = out.replace(/new\s+([A-Za-z_$][\w$]*\.)?WebGLRenderer\s*\(\s*\{([^}]*)\}\s*\)/g, (m, prefix, inner) => {
    if (/\balpha\s*:/.test(inner)) return m;
    changed = true;
    const trimmed = inner.trim();
    return `new ${prefix || ''}WebGLRenderer({ ${trimmed ? trimmed + ', ' : ''}alpha: true })`;
  });

  // setClearColor to transparent
  out = out.replace(/\.setClearColor\s*\(\s*(0xffffff|0xFFFFFF|16777215|'white'|"white"|[^,\)]*)\s*(?:,\s*[^)]*)?\)/g, (m) => {
    changed = true;
    return `.setClearColor(0x000000, 0)`;
  });

  // setClearAlpha if exists
  out = out.replace(/\.setClearAlpha\s*\(\s*1\s*\)/g, () => {
    changed = true;
    return `.setClearAlpha(0)`;
  });

  // If renderer variable exists, set dom/canvas transparent near setSize or appendChild
  if (!/noelleAvatarTransparentV19815/.test(out) && /renderer|WebGLRenderer/.test(out)) {
    const patch = `
try {
  const noelleAvatarTransparentV19815 = (r) => {
    if (!r) return;
    if (typeof r.setClearColor === 'function') r.setClearColor(0x000000, 0);
    if (typeof r.setClearAlpha === 'function') r.setClearAlpha(0);
    if (r.domElement) {
      r.domElement.style.background = 'transparent';
      r.domElement.style.backgroundColor = 'transparent';
      if (r.domElement.parentElement) {
        r.domElement.parentElement.style.background = 'transparent';
        r.domElement.parentElement.style.backgroundColor = 'transparent';
      }
    }
  };
  if (typeof renderer !== 'undefined') noelleAvatarTransparentV19815(renderer);
} catch (_) {}
`;
    if (/renderer\.setSize\s*\([^;]+;/.test(out)) {
      out = out.replace(/(renderer\.setSize\s*\([^;]+;)/, `$1\n${patch}`);
      changed = true;
    } else if (/appendChild\s*\(\s*renderer\.domElement\s*\)\s*;/.test(out)) {
      out = out.replace(/(appendChild\s*\(\s*renderer\.domElement\s*\)\s*;)/, `$1\n${patch}`);
      changed = true;
    }
  }

  // Inject A-pose helper in non-minified files only. For bundles, avoid huge break risk unless clear vrm symbol exists.
  const safeToInjectPose = /vrm/i.test(out) && (out.includes('scene.add(vrm.scene)') || out.includes('currentVrm') || out.includes('activeVrm') || out.includes('loadedVrm') || out.includes('avatarVrm'));
  if (safeToInjectPose && !out.includes('noelleForceAvatarAPoseV19815')) {
    out = injectHelperInto(out);
    changed = true;
  }

  const poseCall = `noelleForceAvatarAPoseV19815(vrm, typeof THREE !== "undefined" ? THREE : null);`;
  if (out.includes('noelleForceAvatarAPoseV19815') && !out.includes(poseCall)) {
    const patterns = [
      /(scene\.add\(\s*vrm\.scene\s*\)\s*;)/,
      /(currentVrm\s*=\s*vrm\s*;)/,
      /(activeVrm\s*=\s*vrm\s*;)/,
      /(loadedVrm\s*=\s*vrm\s*;)/,
      /(avatarVrm\s*=\s*vrm\s*;)/
    ];
    for (const p of patterns) {
      if (p.test(out)) {
        out = out.replace(p, `$1\n${poseCall}`);
        changed = true;
        break;
      }
    }
  }

  return { changed: changed && out !== original, content: out };
}

function patchJsFiles(){
  const roots = ['src/renderer', 'src/renderer_dist', 'src'].map(full).filter(fs.existsSync);
  const seen = new Set();
  const candidates = [];
  for (const r of roots) {
    for (const abs of walk(r)) {
      if (seen.has(abs)) continue;
      seen.add(abs);
      const rr = rel(abs).toLowerCase();
      if (!/\.(js|mjs|cjs)$/.test(rr)) continue;
      if (!/(avatar|vrm|preview|carousel|lab)/i.test(rr)) continue;
      candidates.push(abs);
    }
  }

  if (!candidates.length) {
    warn('Nenhum JS candidato encontrado.');
    return;
  }

  let touched = 0;
  for (const abs of candidates) {
    const r = rel(abs);
    let content;
    try { content = fs.readFileSync(abs, 'utf8'); }
    catch (e) { warn(`Falha ao ler ${r}: ${e.message}`); continue; }

    const result = patchJsContent(content);
    if (!result.changed) continue;
    backup(r);
    fs.writeFileSync(abs, result.content, 'utf8');
    ok(`JS avatar corrigido: ${r}`);
    touched += 1;
  }

  if (!touched) warn('Nenhum JS foi alterado. O preview pode estar em bundle com padrão não reconhecido.');
}

function patchPackageJson(){
  const r = 'package.json';
  if (!exists(r)) { warn('package.json não encontrado.'); return; }
  backup(r);
  let pkg;
  try { pkg = JSON.parse(read(r)); }
  catch (e) { fail(`package.json inválido: ${e.message}`); return; }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.15-avatar-real'] = 'node scripts/repair_v19_8_15_avatar_fix_real_target_2026.cjs';
  pkg.scripts['diagnostico:v19.8.15-avatar-real'] = 'node scripts/diagnostico_v19_8_15_avatar_fix_real_target_2026.cjs';
  write(r, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory(){
  const r = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(r)) return;
  backup(r);
  let md = read(r);
  if (!md.includes('V19.8.15 — Avatar fix real target')) {
    md += '\n\n## V19.8.15 — Avatar fix real target\n\n- Microfix mais certeiro para fundo branco e T-pose/A-pose no Avatar.\n- Varre `src/renderer`, `src/renderer_dist` e HTMLs de preview para pegar o arquivo realmente usado pela aba Avatar.\n- Não mexe nas outras abas e faz backup antes de alterar.\n';
    write(r, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.15 - Avatar fix real target');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(CSS_REF)) fail(`${CSS_REF} não encontrado.`);
  patchControlsCss();
  patchHtmlFiles();
  patchJsFiles();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.15 terminou com problemas.');
  else {
    ok(`Reparo V19.8.15 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e inicie pela opção [1].');
  }
}

main();
