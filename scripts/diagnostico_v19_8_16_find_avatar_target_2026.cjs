#!/usr/bin/env node
'use strict';

/*
  Diagnóstico seguro — não altera arquivos.
  Encontra o arquivo real que renderiza o preview do Avatar:
  frase "Arraste para girar, use scroll para zoom"
  fundo branco
  WebGLRenderer
  setClearColor
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const NEEDLES = [
  'Arraste para girar',
  'use scroll para zoom',
  'carregado. Arraste',
  'Noelle carregado',
  'Yoru carregado',
  'WebGLRenderer',
  'setClearColor',
  '0xffffff',
  '#ffffff',
  '#fff',
  'white',
  'scene.background',
  'new THREE.Color',
  'VRM',
  'GLTFLoader'
];

const IGNORE_DIRS = new Set([
  'node_modules',
  'backups',
  '.git',
  '.venv',
  'release',
  'dist',
  'out'
]);

const EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.css',
  '.json'
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function lineContext(text, needle) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  const lowNeedle = needle.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(lowNeedle)) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      hits.push({
        line: i + 1,
        context: lines.slice(start, end).map((line, idx) => {
          const n = start + idx + 1;
          return `${String(n).padStart(5, ' ')} | ${line}`;
        }).join('\n')
      });
    }
  }
  return hits;
}

function scoreFile(file, text) {
  const lower = text.toLowerCase();
  let score = 0;

  if (lower.includes('arraste para girar')) score += 100;
  if (lower.includes('use scroll para zoom')) score += 100;
  if (lower.includes('carregado. arraste')) score += 80;
  if (lower.includes('webglrenderer')) score += 25;
  if (lower.includes('gltfloader')) score += 25;
  if (lower.includes('vrm')) score += 20;
  if (lower.includes('setclearcolor')) score += 20;
  if (lower.includes('0xffffff') || lower.includes('#ffffff') || lower.includes('#fff') || lower.includes('white')) score += 15;
  if (lower.includes('scene.background')) score += 20;

  const r = rel(file).toLowerCase();
  if (r.includes('avatar')) score += 20;
  if (r.includes('preview')) score += 20;
  if (r.includes('renderer_dist')) score += 25;
  if (r.includes('carousel')) score += 15;

  return score;
}

function main() {
  console.log('================================================================');
  console.log(' Diagnóstico V19.8.16 — encontrar alvo real do Avatar');
  console.log('================================================================');
  console.log('[INFO] Este script NÃO altera arquivos.');
  console.log('');

  const files = walk(ROOT);
  const results = [];

  for (const file of files) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const hits = [];
    for (const needle of NEEDLES) {
      if (text.toLowerCase().includes(needle.toLowerCase())) {
        hits.push(needle);
      }
    }

    if (!hits.length) continue;

    const score = scoreFile(file, text);
    if (score <= 0) continue;

    results.push({
      file,
      rel: rel(file),
      score,
      hits,
      text
    });
  }

  results.sort((a, b) => b.score - a.score);

  if (!results.length) {
    console.log('[ERRO] Nenhum arquivo candidato encontrado.');
    console.log('[DICA] Confirme se você está rodando na raiz do projeto noelle_ia.');
    process.exit(1);
  }

  console.log(`[OK] Candidatos encontrados: ${results.length}`);
  console.log('');

  const top = results.slice(0, 12);

  for (let idx = 0; idx < top.length; idx++) {
    const item = top[idx];
    console.log('----------------------------------------------------------------');
    console.log(`#${idx + 1} score=${item.score}`);
    console.log(`Arquivo: ${item.rel}`);
    console.log(`Achou: ${item.hits.join(', ')}`);
    console.log('');

    const importantNeedles = [
      'Arraste para girar',
      'use scroll para zoom',
      'setClearColor',
      '0xffffff',
      '#ffffff',
      '#fff',
      'white',
      'scene.background',
      'WebGLRenderer'
    ];

    for (const needle of importantNeedles) {
      const contexts = lineContext(item.text, needle);
      for (const ctx of contexts.slice(0, 2)) {
        console.log(`[${needle}] linha ${ctx.line}`);
        console.log(ctx.context);
        console.log('');
      }
    }
  }

  const best = top[0];
  console.log('================================================================');
  console.log(' MAIS PROVÁVEL');
  console.log('================================================================');
  console.log(best.rel);
  console.log('');
  console.log('Me envie o bloco acima, principalmente o arquivo #1 e as linhas mostradas.');
  console.log('A correção certa deve mirar esse arquivo, não outro.');
}

main();
