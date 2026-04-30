#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.17-avatar-targeted-apose-darkbg-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_17_avatar_targeted_apose_darkbg_${STAMP}`);

const TARGETS = [
  'src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js',
  'src/renderer/avatar_carousel_preview_v19_8_2_app.mjs'
];

const CSS_FILE = 'src/styles/noelle_avatar_target_v19_8_17.css';
const GUARD_FILE = 'src/renderer/noelle_avatar_target_guard_v19_8_17.js';

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

function injectHelper(content, isModule) {
  if (content.includes('noelleApplyAPoseV19817')) return content;

  const helper = `
/* NOELLE_V19_8_17_APOSE_BEGIN */
function noelleApplyAPoseV19817(vrm) {
  try {
    const humanoid = vrm && vrm.humanoid;
    if (!humanoid) return false;

    const getBone = humanoid.getNormalizedBoneNode
      ? (name) => humanoid.getNormalizedBoneNode(name)
      : (name) => (humanoid.getRawBoneNode ? humanoid.getRawBoneNode(name) : null);

    const rad = (deg) => deg * Math.PI / 180;
    const set = (name, axis, deg) => {
      const bone = getBone(name);
      if (bone && bone.rotation) bone.rotation[axis] = rad(deg);
    };

    // A-pose leve: braços descem do T-pose sem parecerem colados ao corpo.
    set('leftShoulder', 'z', -5);
    set('rightShoulder', 'z', 5);
    set('leftUpperArm', 'z', -38);
    set('rightUpperArm', 'z', 38);
    set('leftLowerArm', 'z', -6);
    set('rightLowerArm', 'z', 6);
    set('leftHand', 'z', -3);
    set('rightHand', 'z', 3);

    if (typeof vrm.update === 'function') vrm.update(0);
    return true;
  } catch (_) {
    return false;
  }
}
/* NOELLE_V19_8_17_APOSE_END */
`;

  if (isModule) {
    const importBlock = content.match(/^(?:\s*import[^\n]*\n)+/);
    if (importBlock) return content.replace(importBlock[0], importBlock[0] + helper + '\n');
  }

  return helper + '\n' + content;
}

function patchTargetContent(content, rel) {
  let out = content;
  let changed = false;
  const isModule = /\.mjs$/i.test(rel);

  if (!out.includes('Arraste para girar') && !out.includes('use scroll para zoom')) {
    return { changed: false, content };
  }

  // Fundo escuro real: não transparente. Isso tira o branco mesmo se o pai estiver branco.
  out = out.replace(/scene\.background\s*=\s*null\s*;/g, (m) => {
    changed = true;
    if (out.includes('new THREE.Scene')) return 'scene.background = new THREE.Color(0x080706);';
    return 'scene.background = new Color(0x080706);';
  });

  out = out.replace(/renderer\.setClearColor\(0x000000,\s*0\);/g, () => {
    changed = true;
    return 'renderer.setClearColor(0x080706, 1);';
  });

  out = out.replace(/\.setClearColor\(0x000000,\s*0\)/g, () => {
    changed = true;
    return '.setClearColor(0x080706, 1)';
  });

  out = out.replace(/setClearAlpha\(0\)/g, () => {
    changed = true;
    return 'setClearAlpha(1)';
  });

  // Stage/pai: troca transparente por Yoru Ember apenas neste target.
  out = out.replace(/stage\.style\.background\s*=\s*['"]transparent['"]\s*;/g, () => {
    changed = true;
    return "stage.style.background = 'linear-gradient(135deg, #080706, #15100c)';";
  });

  out = out.replace(/stage\.style\.backgroundImage\s*=\s*['"]none['"]\s*;/g, () => {
    changed = true;
    return "stage.style.backgroundImage = 'radial-gradient(circle at 50% 35%, rgba(255,122,26,.14), transparent 36%), linear-gradient(135deg, #080706, #15100c)';";
  });

  out = out.replace(/renderer\.domElement\.style\.background\s*=\s*['"]transparent['"]\s*;/g, () => {
    changed = true;
    return "renderer.domElement.style.background = '#080706';";
  });

  // Injeta A-pose e chama no ponto real do carregamento.
  out = injectHelper(out, isModule);

  const call = `try { noelleApplyAPoseV19817(typeof vrm !== "undefined" ? vrm : (typeof currentVrm !== "undefined" ? currentVrm : null)); } catch (_) {}`;
  if (!out.includes(call)) {
    const patterns = [
      /(fitCameraToObject\(currentRoot\)\s*;)/,
      /(fallback\?\.\s*remove\(\)\s*;)/,
      /(setStatus\(`\$\{name\} carregado\. Arraste para girar, use scroll para zoom\.`[^;]*;)/
    ];

    let inserted = false;
    for (const p of patterns) {
      if (p.test(out)) {
        out = out.replace(p, `${call}\n$1`);
        changed = true;
        inserted = true;
        break;
      }
    }

    if (!inserted) warn(`Não achei ponto exato para chamar A-pose em ${rel}`);
  }

  // Marca status para saber que pegou o target certo.
  if (!out.includes('V19.8.17 alvo correto aplicado')) {
    out = out.replace(/(setStatus\(`\$\{name\} carregado\. Arraste para girar, use scroll para zoom\.`[^;]*;)/, `$1\ntry { console.info("[Noelle] V19.8.17 alvo correto aplicado"); } catch (_) {}`);
    changed = true;
  }

  return { changed: changed && out !== content, content: out };
}

function patchTargets() {
  let touched = 0;

  for (const rel of TARGETS) {
    if (!exists(rel)) {
      warn(`${rel} não encontrado.`);
      continue;
    }

    const content = read(rel);
    const result = patchTargetContent(content, rel);

    if (!result.changed) {
      warn(`${rel} não foi alterado; talvez já esteja corrigido ou o padrão mudou.`);
      continue;
    }

    backup(rel);
    write(rel, result.content);
    ok(`Corrigido alvo real: ${rel}`);
    touched += 1;
  }

  if (!touched) fail('Nenhum target real foi alterado.');
}

function patchControlsHtml() {
  const rel = 'src/controls.html';
  if (!exists(rel)) {
    warn('src/controls.html não encontrado; não injetei CSS/guard.');
    return;
  }

  backup(rel);
  let html = read(rel);
  html = html.replace(/\s*<link[^>]+noelle_avatar_target_v19_8_17\.css[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<script[^>]+noelle_avatar_target_guard_v19_8_17\.js[^>]*>\s*<\/script>\s*/gi, '\n');

  const css = '  <link rel="stylesheet" href="./styles/noelle_avatar_target_v19_8_17.css" data-noelle-avatar-target-v19-8-17="true">';
  const js = '  <script src="./renderer/noelle_avatar_target_guard_v19_8_17.js" defer data-noelle-avatar-target-v19-8-17="true"></script>';

  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${css}\n</head>`);
  else html = `${css}\n${html}`;

  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${js}\n</body>`);
  else html = `${html}\n${js}\n`;

  write(rel, html);
  ok('src/controls.html atualizado com CSS/guard V19.8.17.');
}

function patchPackageJson() {
  const rel = 'package.json';
  if (!exists(rel)) return;
  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (e) { fail(`package.json inválido: ${e.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.17-avatar-target'] = 'node scripts/repair_v19_8_17_avatar_targeted_apose_darkbg_2026.cjs';
  pkg.scripts['diagnostico:v19.8.17-avatar-target'] = 'node scripts/diagnostico_v19_8_17_avatar_targeted_apose_darkbg_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory() {
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;
  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.17 — Avatar targeted')) {
    md += '\n\n## V19.8.17 — Avatar targeted\\n\\n- Correção mira especificamente `src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js` e `src/renderer/avatar_carousel_preview_v19_8_2_app.mjs`, encontrados pelo diagnóstico V19.8.16.\\n- Remove fundo branco usando clearColor/background escuro Yoru Ember no alvo real.\\n- Aplica A-pose leve após o carregamento do VRM.\\n- Patch pequeno e localizado na aba Avatar.\\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main() {
  log('================================================================');
  log(' Noelle/Yoru V19.8.17 - Avatar targeted A-pose + dark background');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [CSS_FILE, GUARD_FILE, 'iniciar.bat'].forEach((rel) => {
    if (exists(rel)) ok(`${rel} existe`);
    else fail(`${rel} não encontrado. Copie o pack inteiro para a raiz.`);
  });

  patchControlsHtml();
  patchTargets();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.17 terminou com problemas.');
  else {
    ok(`Reparo V19.8.17 concluído. Backup: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e inicie pela opção [1].');
  }
}

main();
