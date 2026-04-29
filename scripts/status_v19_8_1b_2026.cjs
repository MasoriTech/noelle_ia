#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
function exists(file) { try { return fs.existsSync(file); } catch (_) { return false; } }
function read(file) { return fs.readFileSync(file, 'utf8'); }

function countManifest() {
  const file = path.join(ROOT, 'src', 'assets', 'avatar_manifest.json');
  if (!exists(file)) return 'ausente';
  try {
    const parsed = JSON.parse(read(file));
    return Array.isArray(parsed) ? `${parsed.length} avatar(es)` : 'não é lista';
  } catch (e) {
    return `inválido: ${e.message}`;
  }
}

function packageVersion() {
  const file = path.join(ROOT, 'package.json');
  if (!exists(file)) return 'package.json ausente';
  try { return JSON.parse(read(file)).version || 'sem version'; } catch (e) { return `package inválido: ${e.message}`; }
}

console.log('================================================================');
console.log(' Status Noelle V19.8.1b');
console.log('================================================================');
console.log(`Pasta: ${ROOT}`);
console.log(`Package version: ${packageVersion()}`);
console.log(`Manifest: ${countManifest()}`);
console.log(`Node: ${process.version}`);
console.log(`preload.js: ${exists(path.join(ROOT, 'preload.js')) ? 'existe' : 'ausente'}`);
console.log(`iniciar.bat: ${exists(path.join(ROOT, 'iniciar.bat')) ? 'existe' : 'ausente'}`);
