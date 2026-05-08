'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PATHS = Object.freeze({
  root: ROOT_DIR,
  rendererIndex: path.join(ROOT_DIR, 'renderer', 'index.html'),
  preload: path.join(ROOT_DIR, 'preload', 'preload.js'),
  configDir: path.join(ROOT_DIR, 'config'),
  dataDir: path.join(ROOT_DIR, 'data'),
  logsDir: path.join(ROOT_DIR, 'data', 'logs'),
  memoryDir: path.join(ROOT_DIR, 'data', 'memory'),
  sessionsDir: path.join(ROOT_DIR, 'data', 'sessions'),
  modelsConfig: path.join(ROOT_DIR, 'config', 'models_config.json'),
  appConfig: path.join(ROOT_DIR, 'config', 'app_config.json')
});

function ensureAppDirs() {
  for (const dir of [PATHS.configDir, PATHS.dataDir, PATHS.logsDir, PATHS.memoryDir, PATHS.sessionsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonSafe(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { ...fallback, __error: String(err && err.message ? err.message : err) };
  }
}

function writeJsonSafe(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

module.exports = { PATHS, ensureAppDirs, readJsonSafe, writeJsonSafe };
