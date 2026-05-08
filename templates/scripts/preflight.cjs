#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const required = ['main/main.js', 'preload/preload.js', 'renderer/index.html', 'core/ai/ollama_client.js', 'config/models_config.json'];
let ok = true;
console.log('Noelle v20 preflight');
for (const rel of required) {
  const exists = fs.existsSync(path.join(root, rel));
  console.log(`${exists ? '[OK]' : '[ERRO]'} ${rel}`);
  if (!exists) ok = false;
}
process.exit(ok ? 0 : 1);
