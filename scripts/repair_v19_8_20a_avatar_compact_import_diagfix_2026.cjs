#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.20a-avatar-compact-import-diagfix-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', 'v19_8_20a_avatar_diagfix_' + STAMP);

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

function patchRuntimeComment(){
  const rel = 'src/renderer/noelle_avatar_compact_import_v19_8_20.js';
  if (!exists(rel)) {
    fail(rel + ' não encontrado. Aplique o V19.8.20 primeiro ou copie este pack na raiz correta.');
    return;
  }

  backup(rel);
  let code = read(rel);

  // O diagnóstico V19.8.20 era simples demais: ele procurava a palavra no arquivo inteiro.
  // O runtime não criava observador; a palavra aparecia só em comentário.
  code = code.replace(/MutationObserver/g, 'DOM observer');

  write(rel, code);
  ok('runtime V19.8.20 limpo do falso positivo textual.');
}

function patchDiagnostic(){
  const rel = 'scripts/diagnostico_v19_8_20_avatar_compact_import_2026.cjs';
  if (!exists(rel)) {
    warn(rel + ' não encontrado; diagnóstico antigo não foi atualizado.');
    return;
  }

  backup(rel);
  let code = read(rel);

  // Troca o check frágil por um check de uso real da API, ignorando comentários/textos.
  code = code.replace(
    /if \(!code\.includes\('MutationObserver'\)\) ok\('runtime sem MutationObserver'\);\s*else err\('runtime contém MutationObserver'\);/g,
    "if (!/new\\s+MutationObserver\\s*\\(|MutationObserver\\s*\\(/.test(code)) ok('runtime sem observador de DOM ativo');\n    else err('runtime contém observador de DOM ativo');"
  );

  write(rel, code);
  ok('diagnóstico V19.8.20 atualizado para evitar falso positivo.');
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) return;

  backup(rel);
  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (e) { warn('package.json inválido: ' + e.message); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.20a-avatar-diagfix'] = 'node scripts/repair_v19_8_20a_avatar_compact_import_diagfix_2026.cjs';
  pkg.scripts['diagnostico:v19.8.20-avatar-compact-import'] = 'node scripts/diagnostico_v19_8_20_avatar_compact_import_2026.cjs';

  write(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok('package.json atualizado para ' + VERSION + '.');
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes('V19.8.20a — Correção de diagnóstico Avatar')) {
    md += '\n\n## V19.8.20a — Correção de diagnóstico Avatar\n\n- Corrige falso positivo do diagnóstico V19.8.20 que acusava `MutationObserver` por causa de comentário no runtime.\n- O runtime do Avatar compacto/importar não usa observador de DOM ativo.\n- Não altera layout, VRM, câmera, importação ou abas.\n';
    write(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.20a - correção do falso positivo MutationObserver');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchRuntimeComment();
  patchDiagnostic();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Reparo V19.8.20a terminou com problemas.');
  else {
    ok('Reparo V19.8.20a concluído. Backup: ' + path.relative(ROOT, BACKUP_DIR));
    log('[INFO] Rode novamente o diagnóstico V19.8.20.');
  }
}

main();
