#!/usr/bin/env node
/*
  Noelle Companion 2026 - V19.8.0 Base Segura
  Reparo manual e seguro. Nao roda automaticamente na opcao [1] do iniciar.bat.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const assetsOnly = args.has('--assets-only');
const VERSION = '19.8.0-base-segura-2026';

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function fail(msg) { console.error(`[ERRO] ${msg}`); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, data) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, 'utf8');
}
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
function backupFile(rel, backupDir) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return false;
  const dest = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
  return true;
}
function makeBackup(label, files) {
  const dir = path.join(root, 'backups', `${label}_${timestamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const rel of files) {
    if (backupFile(rel, dir)) count++;
  }
  return { dir: path.relative(root, dir), count };
}

function toId(name) {
  return String(name)
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'avatar';
}
function toDisplayName(file) {
  return path.basename(file, path.extname(file))
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    warn(`Nao foi possivel ler ${path.relative(root, dir)}: ${err.message}`);
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'release', 'dist', 'win-unpacked', 'backups'].includes(entry.name)) continue;
      walk(abs, out);
    } else {
      out.push(abs);
    }
  }
  return out;
}
function generateAvatarManifest() {
  const searchDirs = [
    'src/assets',
    'src/assets/avatars',
    'src/assets/vrm',
    'src/assets/models',
    'assets',
    'assets/avatars',
    'assets/vrm',
    'assets/models'
  ];
  const seen = new Set();
  const avatars = [];
  for (const relDir of searchDirs) {
    const absDir = path.join(root, relDir);
    for (const abs of walk(absDir, [])) {
      const ext = path.extname(abs).toLowerCase();
      if (!['.vrm', '.glb', '.gltf'].includes(ext)) continue;
      const rel = path.relative(path.join(root, 'src'), abs).replace(/\\/g, '/');
      const relFromRoot = path.relative(root, abs).replace(/\\/g, '/');
      const key = relFromRoot.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const type = ext.slice(1);
      avatars.push({
        id: toId(path.basename(abs)),
        name: toDisplayName(abs),
        type,
        rel: rel.startsWith('..') ? relFromRoot : rel,
        rootRel: relFromRoot
      });
    }
  }
  avatars.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  write('src/assets/avatar_manifest.json', JSON.stringify(avatars, null, 2) + '\n');
  ok(`avatar_manifest.json gerado: ${avatars.length} avatar(es).`);
  return avatars.length;
}

function updatePackage() {
  if (!exists('package.json')) {
    warn('package.json nao encontrado. Pulando atualizacao de scripts.');
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(read('package.json'));
  } catch (err) {
    fail(`package.json invalido: ${err.message}`);
    return;
  }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['diagnostico:v19.8-base'] = 'node scripts/diagnostico_v19_8_base_segura_2026.cjs';
  pkg.scripts['repair:v19.8-base'] = 'node scripts/repair_v19_8_base_segura_2026.cjs';
  pkg.scripts['status:v19.8-base'] = 'node scripts/status_v19_8_base_segura_2026.cjs';
  write('package.json', JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json atualizado para V19.8.0 Base Segura.');
}

function updateMemory() {
  const rel = 'MEMORIA_GPT_NOELLE.md';
  const note = `\n\n## V19.8.0 Base Segura - 2026\n\n- O projeto deve ter um unico \`iniciar.bat\` principal.\n- A opcao [1] do \`iniciar.bat\` deve apenas iniciar o programa, sem aplicar patch, sem build, sem reescrever arquivos e sem PowerShell/Activate.ps1.\n- Reparos, diagnosticos e rebuilds devem ficar em opcoes separadas do menu.\n- Esta fase nao altera a UI do Avatar; ela cria a base segura antes da limpeza do preload e da aba Avatar real.\n`;
  if (!exists(rel)) {
    write(rel, `# MEMORIA GPT NOELLE\n${note}`);
    ok('MEMORIA_GPT_NOELLE.md criado com nota V19.8.0.');
    return;
  }
  const current = read(rel);
  if (current.includes('V19.8.0 Base Segura')) {
    ok('MEMORIA_GPT_NOELLE.md ja contem V19.8.0.');
    return;
  }
  write(rel, current.trimEnd() + note);
  ok('MEMORIA_GPT_NOELLE.md atualizado com V19.8.0.');
}

function writeDocs() {
  const doc = `# Noelle Companion 2026 - V19.8.0 Base Segura\n\nEsta fase consolida a inicializacao antes de mexer de novo na UI do Avatar.\n\n## Regra principal\n\nA opcao [1] do \`iniciar.bat\` apenas inicia o programa. Ela nao aplica patch, nao roda build, nao reescreve arquivos e nao chama PowerShell/Activate.ps1.\n\n## Menu\n\n- [1] Iniciar programa agora\n- [2] Rodar diagnostico V19.8 Base\n- [3] Reparar projeto / aplicar V19.8 Base Segura\n- [4] Regerar manifest e bundles do Avatar\n- [5] Mover outros .bat antigos para backup seguro\n- [6] Excluir outros .bat antigos permanentemente\n- [7] Mostrar status do projeto\n\n## O que esta fase faz\n\n- Cria base segura de inicializacao.\n- Atualiza scripts de diagnostico no package.json.\n- Gera \`src/assets/avatar_manifest.json\`.\n- Mantem reparo manual separado do iniciar direto.\n\n## O que esta fase ainda nao faz\n\n- Ainda nao limpa o preload.js.\n- Ainda nao remove runtimes antigos V19.3/V19.5.\n- Ainda nao transforma a aba Avatar em rota real.\n\nEssas etapas ficam para as proximas fases V19.8.1 e V19.8.2.\n`;
  write('docs/NOELLE_V19_8_0_BASE_SEGURA.md', doc);
  ok('docs/NOELLE_V19_8_0_BASE_SEGURA.md atualizado.');
}

function main() {
  log('================================================================');
  log(' Noelle Companion 2026 - Repair V19.8.0 Base Segura');
  log('================================================================');
  log('');

  if (!exists('package.json') && !assetsOnly) {
    warn('package.json nao encontrado. Confirme que voce esta na raiz do projeto.');
  }

  const backupTargets = ['package.json', 'MEMORIA_GPT_NOELLE.md', 'src/assets/avatar_manifest.json'];
  if (!assetsOnly) backupTargets.push('iniciar.bat');
  const backup = makeBackup('v19_8_0_base_segura', backupTargets);
  ok(`Backup criado: ${backup.dir} (${backup.count} arquivo(s)).`);

  generateAvatarManifest();

  if (!assetsOnly) {
    updatePackage();
    updateMemory();
    writeDocs();
    ok('Base V19.8.0 aplicada. Use iniciar.bat opcao [2] para diagnostico.');
  } else {
    ok('Modo assets-only concluido.');
  }
}

try {
  main();
} catch (err) {
  fail(err && err.stack ? err.stack : String(err));
}
