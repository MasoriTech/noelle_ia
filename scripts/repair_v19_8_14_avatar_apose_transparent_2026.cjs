#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.14-avatar-apose-transparent-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_14_avatar_apose_transparent_${STAMP}`);
const MARKER_BEGIN = '/* NOELLE_V19_8_14_AVATAR_FIX_BEGIN */';
const MARKER_END = '/* NOELLE_V19_8_14_AVATAR_FIX_END */';

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

function walk(dir){
  const out = [];
  function visit(d){
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'backups' || entry.name.startsWith('.git')) continue;
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) visit(p);
      else out.push(p);
    }
  }
  if (fs.existsSync(dir)) visit(dir);
  return out;
}

function relative(abs){ return path.relative(ROOT, abs).replace(/\\/g, '/'); }

function ensureControlsCss(){
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    warn('src/controls.html não encontrado; CSS do microfix não foi injetado.');
    return;
  }
  backup(rel);
  let html = read(rel);
  const token = 'noelle_avatar_microfix_v19_8_14.css';
  html = html.replace(new RegExp(`<link[^>]+${token}[^>]*>\\s*`, 'gi'), '\n');
  const link = '  <link rel="stylesheet" href="./styles/noelle_avatar_microfix_v19_8_14.css" data-noelle-avatar-microfix-v19-8-14="true">';
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${link}\n</head>`);
  else html = `${link}\n${html}`;
  write(rel, html);
  ok('src/controls.html atualizado com CSS do microfix V19.8.14.');
}

function isAvatarRendererFile(abs){
  const rel = relative(abs).toLowerCase();
  if (!/\.(js|mjs|cjs)$/.test(rel)) return false;
  if (!rel.includes('src/renderer/')) return false;
  return rel.includes('avatar') || rel.includes('preview') || rel.includes('vrm');
}

function patchRendererContent(content){
  let out = content;
  let changed = false;

  if (!/WebGLRenderer/.test(out) || !/VRM|three-vrm|@pixiv\/three-vrm/.test(out)) {
    return { changed: false, content };
  }

  // alpha true on renderer creation
  out = out.replace(/new\s+THREE\.WebGLRenderer\s*\(\s*\{([^}]*)\}\s*\)/g, (m, inner) => {
    if (/\balpha\s*:/.test(inner)) return m;
    changed = true;
    const cleaned = inner.trim().replace(/\s+$/,'');
    const prefix = cleaned ? `${cleaned}, ` : '';
    return `new THREE.WebGLRenderer({ ${prefix}alpha: true })`;
  });

  // transparent clear color
  out = out.replace(/renderer\.setClearColor\s*\([^)]*\)\s*;?/g, () => {
    changed = true;
    return 'renderer.setClearColor(0x000000, 0);';
  });

  if (/new\s+THREE\.WebGLRenderer\(/.test(out) && !/renderer\.setClearColor\s*\(\s*0x000000\s*,\s*0\s*\)/.test(out)) {
    out = out.replace(/(new\s+THREE\.WebGLRenderer\s*\([^\n]+\)\s*;)/, '$1\nrenderer.setClearColor(0x000000, 0);');
    changed = true;
  }

  // inject helper only once
  if (!out.includes(MARKER_BEGIN)) {
    const helper = `\n${MARKER_BEGIN}\nfunction noelleApplyDefaultAPose(vrm, THREERef) {\n  try {\n    const humanoid = vrm && vrm.humanoid;\n    const THREE_SAFE = THREERef || (typeof THREE !== 'undefined' ? THREE : null);\n    if (!humanoid || !humanoid.getNormalizedBoneNode || !THREE_SAFE || !THREE_SAFE.MathUtils) return false;\n    const rad = THREE_SAFE.MathUtils.degToRad;\n    const bone = (name) => humanoid.getNormalizedBoneNode(name);\n    const leftShoulder = bone('leftShoulder');\n    const rightShoulder = bone('rightShoulder');\n    const leftUpperArm = bone('leftUpperArm');\n    const rightUpperArm = bone('rightUpperArm');\n    const leftLowerArm = bone('leftLowerArm');\n    const rightLowerArm = bone('rightLowerArm');\n\n    if (leftShoulder) leftShoulder.rotation.z = rad(6);\n    if (rightShoulder) rightShoulder.rotation.z = rad(-6);\n    if (leftUpperArm) leftUpperArm.rotation.z = rad(18);\n    if (rightUpperArm) rightUpperArm.rotation.z = rad(-18);\n    if (leftLowerArm) leftLowerArm.rotation.z = rad(-2);\n    if (rightLowerArm) rightLowerArm.rotation.z = rad(2);\n\n    if (typeof vrm.update === 'function') vrm.update(0);\n    return true;\n  } catch (_) {\n    return false;\n  }\n}\n${MARKER_END}\n`;
    // inject near top after imports if possible
    if (/^import[\s\S]+?;\s*/m.test(out)) {
      const lastImportIndex = out.lastIndexOf('import ');
      if (lastImportIndex >= 0) {
        const tail = out.slice(lastImportIndex);
        const end = tail.indexOf('\n');
      }
      const importBlockMatch = out.match(/^(?:import[^\n]*\n)+/m);
      if (importBlockMatch) {
        out = out.replace(importBlockMatch[0], importBlockMatch[0] + helper + '\n');
      } else {
        out = helper + '\n' + out;
      }
    } else {
      out = helper + '\n' + out;
    }
    changed = true;
  }

  // call helper after avatar/vrm assignment or scene add
  const call = 'noelleApplyDefaultAPose(vrm, typeof THREE !== "undefined" ? THREE : null);';
  if (!out.includes(call)) {
    const patterns = [
      /(scene\.add\(\s*vrm\.scene\s*\)\s*;)/,
      /(currentVrm\s*=\s*vrm\s*;)/,
      /(activeVrm\s*=\s*vrm\s*;)/,
      /(avatarVrm\s*=\s*vrm\s*;)/,
      /(loadedVrm\s*=\s*vrm\s*;)/
    ];
    let inserted = false;
    for (const p of patterns) {
      if (p.test(out)) {
        out = out.replace(p, `$1\n${call}`);
        changed = true;
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      out = out.replace(/(const\s+vrm\s*=\s*await\s+VRM[^;]+;)/, `$1\n${call}`);
      if (out.includes(call)) changed = true;
    }
  }

  // make canvas container transparent in JS if present
  const stagePatch = `\ntry {\n  const stage = (renderer && renderer.domElement && renderer.domElement.parentElement) ? renderer.domElement.parentElement : null;\n  if (stage) {\n    stage.style.background = 'transparent';\n    stage.style.backgroundImage = 'none';\n  }\n  if (renderer && renderer.domElement) renderer.domElement.style.background = 'transparent';\n} catch (_) {}\n`;
  if (!out.includes("stage.style.background = 'transparent'")) {
    out = out.replace(/(renderer\.setClearColor\(0x000000, 0\);)/, `$1${stagePatch}`);
    if (out.includes("stage.style.background = 'transparent'")) changed = true;
  }

  return { changed, content: out };
}

function patchRendererFiles(){
  const files = walk(full('src/renderer')).filter(isAvatarRendererFile);
  if (!files.length) {
    warn('Nenhum arquivo candidato em src/renderer foi encontrado.');
    return;
  }

  let touched = 0;
  for (const abs of files) {
    const rel = relative(abs);
    let content;
    try { content = fs.readFileSync(abs, 'utf8'); }
    catch (e) { warn(`Falha ao ler ${rel}: ${e.message}`); continue; }

    const result = patchRendererContent(content);
    if (!result.changed) continue;
    backup(rel);
    fs.writeFileSync(abs, result.content, 'utf8');
    ok(`Microfix aplicado em ${rel}`);
    touched += 1;
  }
  if (!touched) warn('Nenhum renderer precisou de mudança ou o padrão não foi encontrado.');
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) { warn('package.json não encontrado.'); return; }
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (e) { fail(`package.json inválido: ${e.message}`); return; }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.14-avatar'] = 'node scripts/repair_v19_8_14_avatar_apose_transparent_2026.cjs';
  pkg.scripts['diagnostico:v19.8.14-avatar'] = 'node scripts/diagnostico_v19_8_14_avatar_apose_transparent_2026.cjs';
  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.14 — Avatar microfix')) {
    md += '\n\n## V19.8.14 — Avatar microfix\n\n- Ajusta preview/avatar para usar A-pose leve no lugar de T-pose.\n- Tenta tornar o renderer transparente (`alpha: true` + `setClearColor(0x000000, 0)`).\n- Injeta CSS seguro para remover fundo branco da área do avatar.\n- Patch pequeno e localizado; não mexe nas outras abas.\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.14 - Avatar microfix A-pose + fundo transparente');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  ['src/styles/noelle_avatar_microfix_v19_8_14.css', 'scripts/repair_v19_8_14_avatar_apose_transparent_2026.cjs', 'scripts/diagnostico_v19_8_14_avatar_apose_transparent_2026.cjs', 'iniciar.bat'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz do projeto.`);
  });

  ensureControlsCss();
  patchRendererFiles();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.14 terminou com problemas.');
  else {
    ok(`Reparo V19.8.14 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e depois inicie o app pela opção [1].');
  }
}

main();
