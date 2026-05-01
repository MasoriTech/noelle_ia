/* Noelle Stream V19.8.34 — patch cirúrgico */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const VERSION = 'V19.8.34';
const routerRel = path.join('src','renderer','modules','noelle_tab_router_v19_8_34.js');
const routerSrc = path.join(__dirname, '..', routerRel);
const routerDst = path.join(ROOT, routerRel);

function exists(p){ try { return fs.existsSync(p); } catch { return false; } }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p, s){ fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, s, 'utf8'); }
function copy(a,b){ fs.mkdirSync(path.dirname(b), {recursive:true}); fs.copyFileSync(a,b); }
function stamp(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function backup(file, bk){ if (exists(file)) { const dst = path.join(bk, file.replace(/[\\/]/g, '__')); copy(path.join(ROOT,file), dst); } }
function check(file){ const r = cp.spawnSync(process.execPath, ['--check', file], {encoding:'utf8'}); if (r.status !== 0) throw new Error(`node --check falhou em ${file}\n${r.stderr || r.stdout}`); }

console.log('================================================================');
console.log(' Noelle Stream V19.8.34 - reforço de troca de aba');
console.log('================================================================');

if (!exists(path.join(ROOT,'package.json')) || !exists(path.join(ROOT,'src'))) {
  console.error('[ERRO] Rode na raiz do projeto noelle_ia.');
  process.exit(1);
}

const backupDir = path.join(ROOT, 'backups', `stream_v19_8_34_${stamp()}`);
fs.mkdirSync(backupDir, {recursive:true});

const candidateHtml = [
  path.join('src','index.html'),
  path.join('index.html'),
  path.join('src','renderer','index.html')
].filter((f) => exists(path.join(ROOT,f)));

for (const f of candidateHtml) backup(f, backupDir);
backup(routerRel, backupDir);

copy(routerSrc, routerDst);
check(routerDst);
console.log('[OK] modulo criado:', routerRel);

const scriptTag = '<script defer src="./renderer/modules/noelle_tab_router_v19_8_34.js"></script>';
const altScriptTag = '<script defer src="renderer/modules/noelle_tab_router_v19_8_34.js"></script>';

let injected = false;
for (const rel of candidateHtml) {
  const abs = path.join(ROOT, rel);
  let text = read(abs);
  if (text.includes('noelle_tab_router_v19_8_34.js')) {
    console.log('[OK] HTML ja tinha router:', rel);
    injected = true;
    continue;
  }
  const tag = rel === path.join('src','index.html') ? scriptTag : altScriptTag;
  if (/<\/body>/i.test(text)) text = text.replace(/<\/body>/i, `  ${tag}\n</body>`);
  else text += `\n${tag}\n`;
  write(abs, text);
  console.log('[OK] router injetado em:', rel);
  injected = true;
}

if (!injected) {
  console.warn('[AVISO] Nenhum HTML encontrado para injetar script automaticamente.');
  console.warn('Inclua manualmente no HTML principal:');
  console.warn(scriptTag);
}

const diagRel = path.join('scripts','diagnostico_stream_v19_8_34_2026.cjs');
const diagDst = path.join(ROOT, diagRel);
const diagSrc = path.join(__dirname, 'diagnostico_stream_v19_8_34_2026.cjs');
copy(diagSrc, diagDst);
console.log('[OK] diagnostico instalado:', diagRel);

console.log('----------------------------------------------------------------');
console.log('[OK] Patch aplicado. Rode: node scripts\\diagnostico_stream_v19_8_34_2026.cjs');
