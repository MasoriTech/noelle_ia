const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    return '';
  }
}

function activeScript(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`).test(html);
}

function activeLink(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<link[^>]*${escaped}[^>]*>`).test(html);
}

console.log('Avatar Design V39.4 Hardened Diagnostics');
console.log('==========================================');

[
  'src/renderer/pages/avatar/avatar_design_owner_v39_4.js',
  'src/renderer/pages/avatar/avatar_design_v39_4.css',
  'src/avatar_loadfile_preview_v19_8_3.html',
  'src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs',
  'config/avatar_design_v39_4.json'
].forEach((file) => {
  console.log((exists(file) ? '[OK] ' : '[MISSING] ') + file);
});

const owner = read('src/renderer/pages/avatar/avatar_design_owner_v39_4.js');
console.log('');
console.log('owner v39.4:');
console.log(owner.includes('ROOT_ID = "avatarDesignOwnerV394"') ? '[OK] ROOT_ID v39.4' : '[WARN] ROOT_ID não confirmado');
console.log(owner.includes('applyHardLayout') ? '[OK] applyHardLayout presente' : '[WARN] applyHardLayout ausente');
console.log(owner.includes('healthCheck') ? '[OK] healthCheck presente' : '[WARN] healthCheck ausente');
console.log(owner.includes('avatar_design_v39_4.css') ? '[OK] CSS auto-inject presente' : '[WARN] CSS auto-inject ausente');
console.log(owner.includes('avatar_loadfile_preview_v19_8_3.html') ? '[OK] Loadfile v19.8.3 preservado' : '[WARN] Loadfile v19.8.3 não encontrado no owner');

const controls = read('src/controls.html');
console.log('');
console.log('controls.html:');
console.log(activeLink(controls, 'avatar_design_v39_4.css') ? '[OK] CSS v39.4 ativo' : '[MISSING] CSS v39.4 ativo');
console.log(activeScript(controls, 'avatar_design_owner_v39_4.js') ? '[OK] owner v39.4 ativo' : '[MISSING] owner v39.4 ativo');

const oldScripts = [
  'avatar_design_owner_v39_3.js',
  'avatar_design_owner_v39_2.js',
  'avatar_design_owner_v39_1.js',
  'avatar_design_owner_v39.js',
  'avatar_render_owner_v38.js',
  'avatar_restore_loadfile_v19_8_3.js',
  'avatar_carousel_mount_v31.js',
  'avatar_page_v31.js',
  'noelle_avatar_tab_v19_8_2.js'
];

oldScripts.forEach((name) => {
  console.log(activeScript(controls, name) ? '[WARN] antigo ativo: ' + name : '[OK] antigo não ativo: ' + name);
});

console.log('');
console.log('Backups:');
console.log(exists('src/controls.html.bak_v39_4') ? '[OK] src/controls.html.bak_v39_4' : '[INFO] sem backup v39.4');
console.log(exists('src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs.bak_v39_4') ? '[OK] preview app backup v39.4' : '[INFO] preview app backup v39.4 não necessário');
