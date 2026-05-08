#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const targets = [path.join(root, 'data', 'cache')];
for (const target of targets) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  console.log(`[OK] Limpo: ${path.relative(root, target)}`);
}
console.log('[OK] Limpeza leve concluida. Logs e memorias foram preservados.');
