const fs = require('fs');
const path = require('path');
const { rootPath } = require('../main/app_paths');

function safeConfigName(name) {
  if (!name || name.includes('..') || path.isAbsolute(name)) throw new Error('Nome de config invalido');
  return name;
}

function readConfig(name) {
  const file = rootPath('config', safeConfigName(name));
  if (!fs.existsSync(file)) return { ok: false, missing: true, name };
  return { ok: true, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function writeConfig(name, data) {
  const file = rootPath('config', safeConfigName(name));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return { ok: true, name };
}

module.exports = { readConfig, writeConfig };
