#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const modelsConfigPath = path.join(ROOT, 'config', 'models_config.json');
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function log(label, value) { console.log(`${label.padEnd(24)} ${value}`); }
async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 120)}`);
    return text ? JSON.parse(text) : {};
  } finally { clearTimeout(id); }
}

(async () => {
  console.log('================================================================');
  console.log(' Noelle v20 - Diagnostico Chat Texto');
  console.log('================================================================');
  log('ROOT', ROOT);
  log('Node', process.version);
  log('Platform', `${process.platform} ${process.arch}`);
  log('package.json', fs.existsSync(path.join(ROOT, 'package.json')) ? 'OK' : 'FALTANDO');
  log('main/main.js', fs.existsSync(path.join(ROOT, 'main', 'main.js')) ? 'OK' : 'FALTANDO');
  log('preload.js', fs.existsSync(path.join(ROOT, 'preload', 'preload.js')) ? 'OK' : 'FALTANDO');
  log('index.html', fs.existsSync(path.join(ROOT, 'renderer', 'index.html')) ? 'OK' : 'FALTANDO');

  const cfg = readJson(modelsConfigPath, {});
  const base = String(cfg.ollama_url || 'http://127.0.0.1:11434').replace(/\/$/, '');
  log('Ollama URL', base);
  log('Modelo padrao', cfg.default_model || 'qwen3:0.6b');

  try {
    const version = await fetchJson(`${base}/api/version`, Number(cfg.status_timeout_ms || 5000));
    log('Ollama status', `ONLINE ${version.version || ''}`.trim());
  } catch (err) {
    log('Ollama status', `OFFLINE/ERRO: ${err.message || err}`);
    console.log('');
    console.log('[DICA] Abra o Ollama ou rode: ollama serve');
    console.log('[DICA] Confira se o modelo existe: ollama list');
    process.exitCode = 2;
    return;
  }

  try {
    const tags = await fetchJson(`${base}/api/tags`, Number(cfg.status_timeout_ms || 5000));
    const models = Array.isArray(tags.models) ? tags.models.map(m => m.name) : [];
    log('Modelos instalados', models.length ? models.join(', ') : 'nenhum');
    if (cfg.default_model && !models.includes(cfg.default_model)) {
      console.log(`[AVISO] Modelo padrao nao aparece no ollama list: ${cfg.default_model}`);
      console.log(`[DICA] Baixe com: ollama pull ${cfg.default_model}`);
    }
  } catch (err) {
    log('Lista modelos', `ERRO: ${err.message || err}`);
  }

  console.log('================================================================');
  console.log('[OK] Diagnostico concluido.');
})();
