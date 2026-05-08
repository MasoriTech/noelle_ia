const fs = require('fs');
const path = require('path');

function memoryFile(rootDir) {
  return path.join(rootDir, 'data', 'memory', 'memory.json');
}

function readMemory(rootDir) {
  const file = memoryFile(rootDir);
  if (!fs.existsSync(file)) return { facts: [], sessions: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeMemory(rootDir, data) {
  const file = memoryFile(rootDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

module.exports = { readMemory, writeMemory };
