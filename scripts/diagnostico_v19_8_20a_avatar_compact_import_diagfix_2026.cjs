#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function log(msg){ console.log(msg); }
function ok(msg){ log('[OK] ' + msg); }
function warn(msg){ log('[AVISO] ' + msg); }
function err(msg){ log('[ERRO] ' + msg); process.exitCode = 1; }
function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function read(rel){ return fs.readFileSync(full(rel), 'utf8'); }

function main(){
  log('================================================================');
  log(' Diagnóstico V19.8.20a - falso positivo corrigido');
  log('================================================================');

  const runtime = 'src/renderer/noelle_avatar_compact_import_v19_8_20.js';
  if (!exists(runtime)) {
    err(runtime + ' não encontrado');
  } else {
    const code = read(runtime);
    if (code.includes('noelleAvatarCompactImportV19820')) ok('runtime de Avatar compacto/importar presente');
    else err('runtime de Avatar compacto/importar não encontrado');

    if (!/new\s+MutationObserver\s*\(|MutationObserver\s*\(/.test(code)) ok('runtime sem observador de DOM ativo');
    else err('runtime contém observador de DOM ativo');

    if (!code.includes('.remove(') && !code.includes('removeChild')) ok('runtime não remove DOM');
    else err('runtime remove DOM');

    if (code.includes('Importar avatar') && code.includes('Acionar avatar')) ok('botões Importar/Acionar continuam presentes');
    else err('botões Importar/Acionar não encontrados');
  }

  const oldDiag = 'scripts/diagnostico_v19_8_20_avatar_compact_import_2026.cjs';
  if (exists(oldDiag)) {
    const d = read(oldDiag);
    if (d.includes('observador de DOM ativo') || d.includes('new\\s+MutationObserver')) ok('diagnóstico antigo atualizado');
    else warn('diagnóstico antigo pode continuar com check frágil');
  }

  if (process.exitCode) err('Diagnóstico V19.8.20a encontrou problemas.');
  else ok('Diagnóstico V19.8.20a aprovado.');
}

main();
