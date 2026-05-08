#!/usr/bin/env node
/*
  Noelle v20 - Organizador Seguro
  - Nao apaga arquivos.
  - Nao sobrescreve arquivos existentes.
  - Cria backup de arquivos criticos.
  - Opcional: --ativar-v20 altera package.json para usar main/main.js.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packRoot = path.resolve(__dirname, '..');
const templatesRoot = path.join(packRoot, 'templates');
const args = new Set(process.argv.slice(2));
const activateV20 = args.has('--ativar-v20');

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const backupDir = path.join(root, '.noelle_backups', `organizacao_v20_${nowStamp()}`);

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function err(msg) { console.error(`[ERRO] ${msg}`); }

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(p) {
  return fs.existsSync(p);
}

function copyFileSafe(src, dst) {
  ensureDir(path.dirname(dst));
  if (exists(dst)) {
    warn(`Mantido existente: ${path.relative(root, dst)}`);
    return false;
  }
  fs.copyFileSync(src, dst);
  ok(`Criado: ${path.relative(root, dst)}`);
  return true;
}

function copyRecursiveSafe(srcDir, dstDir) {
  if (!exists(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      ensureDir(dst);
      copyRecursiveSafe(src, dst);
    } else {
      copyFileSafe(src, dst);
    }
  }
}

function backupIfExists(rel) {
  const src = path.join(root, rel);
  if (!exists(src)) return;
  const dst = path.join(backupDir, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  ok(`Backup: ${rel}`);
}

function writeLocalReadme() {
  const file = path.join(root, 'README_LOCAL_ORGANIZACAO_V20.md');
  if (exists(file)) return warn('README_LOCAL_ORGANIZACAO_V20.md ja existe; mantido.');
  const text = `# Organizacao Noelle v20 aplicada\n\n` +
`Este projeto recebeu a estrutura v20 em modo seguro.\n\n` +
`## O que foi feito\n\n` +
`- Pastas v20 criadas.\n` +
`- Arquivos existentes foram preservados.\n` +
`- Backups foram salvos em: ${path.relative(root, backupDir).replace(/\\/g, '/')}\n\n` +
`## Proximos passos\n\n` +
`1. Rode: npm run diagnostico:v20\n` +
`2. Rode: npm run start:v20\n` +
`3. Porte o chat texto primeiro.\n` +
`4. Depois porte Voz IA, TTS, Avatar e Stream, nessa ordem.\n\n` +
`## Regra\n\n` +
`Nao traga tudo de uma vez. Cada modulo precisa funcionar sozinho antes de conectar no resto.\n`;
  fs.writeFileSync(file, text, 'utf8');
  ok('Criado: README_LOCAL_ORGANIZACAO_V20.md');
}

function patchPackageJson() {
  const pkgPath = path.join(root, 'package.json');
  if (!exists(pkgPath)) {
    warn('package.json nao encontrado; pulando ativacao v20.');
    return;
  }
  backupIfExists('package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (e) {
    err('package.json invalido; nao foi alterado.');
    process.exitCode = 1;
    return;
  }
  pkg.main = 'main/main.js';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['start:v20'] = 'electron .';
  pkg.scripts['diagnostico:v20'] = 'node scripts/preflight.cjs';
  pkg.scripts['limpar:v20'] = 'node scripts/limpar.cjs';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  ok('package.json atualizado para main/main.js e scripts v20.');
}

function main() {
  log('Raiz detectada: ' + root);
  ensureDir(backupDir);
  backupIfExists('main.js');
  backupIfExists('preload.js');
  backupIfExists('iniciar.bat');

  copyRecursiveSafe(templatesRoot, root);
  writeLocalReadme();

  if (activateV20) {
    patchPackageJson();
  } else {
    warn('package.json nao foi alterado. Use --ativar-v20 quando quiser ativar o skeleton.');
  }

  log('\nResumo:');
  log('- Estrutura criada sem apagar o projeto antigo.');
  log('- Backup salvo em: ' + path.relative(root, backupDir));
  log('- Proximo teste: npm run diagnostico:v20');
}

try {
  main();
} catch (e) {
  err(e && e.stack ? e.stack : String(e));
  process.exit(1);
}
