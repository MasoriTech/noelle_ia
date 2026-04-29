#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const entry = path.join(SRC, 'renderer', 'avatar_carousel_preview_v19_7_8_app.js');
const outdir = path.join(SRC, 'renderer_dist');
const outfile = path.join(outdir, 'avatar_carousel_preview_v19_7_8.bundle.js');

function ok(msg) { console.log('[OK] ' + msg); }
function fail(msg) { console.error('[ERRO] ' + msg); process.exit(1); }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function ensureManifest() {
  const assetsDir = path.join(SRC, 'assets');
  const manifest = path.join(assetsDir, 'avatar_manifest.json');
  if (exists(manifest)) return;
  ensureDir(assetsDir);
  const roots = [assetsDir, path.join(ROOT, 'assets')];
  const skip = new Set(['node_modules', '.git', 'release', 'dist', 'backups', '.venv', 'venv']);
  const found = [];
  function walk(dir) {
    if (!exists(dir)) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (skip.has(ent.name)) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(vrm|glb)$/i.test(ent.name)) found.push(path.resolve(p));
    }
  }
  roots.forEach(walk);
  const avatars = Array.from(new Set(found)).map((file, i) => ({
    id: 'avatar_' + String(i + 1).padStart(2, '0'),
    name: path.basename(file).replace(/\.(vrm|glb)$/i, '').replace(/[_-]+/g, ' ').trim() || ('Avatar ' + (i + 1)),
    file: path.relative(SRC, file).replace(/\\/g, '/')
  }));
  fs.writeFileSync(manifest, JSON.stringify({ version: '19.7.8', generatedAt: new Date().toISOString(), avatars }, null, 2) + '\n', 'utf8');
}

async function main() {
  if (!exists(entry)) fail('Entrada não encontrada: ' + path.relative(ROOT, entry));
  ensureDir(outdir);
  ensureManifest();
  let esbuild;
  try { esbuild = require('esbuild'); }
  catch { fail('esbuild não encontrado. Rode: npm install'); }
  try {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      outfile,
      platform: 'browser',
      target: ['chrome118'],
      format: 'iife',
      sourcemap: false,
      logLevel: 'silent',
      define: { 'process.env.NODE_ENV': '"production"' }
    });
    ok('Bundle Avatar V19.7.8 gerado: ' + path.relative(ROOT, outfile));
  } catch (err) {
    fail('Build Avatar V19.7.8 falhou: ' + (err && err.message ? err.message : String(err)));
  }
}

main();
