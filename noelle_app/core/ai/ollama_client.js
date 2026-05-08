'use strict';

function normalizeBaseUrl(cfg) {
  const url = String((cfg && cfg.ollama_url) || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').trim();
  return url.replace(/\/$/, '');
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const t = timeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: t.signal });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data && (data.error || data.message) ? (data.error || data.message) : `${res.status} ${res.statusText}`;
      throw new Error(`Ollama respondeu erro: ${msg}`);
    }
    return data;
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error(`Timeout falando com Ollama em ${timeoutMs}ms.`);
    throw err;
  } finally {
    t.cancel();
  }
}

async function getStatus(cfg = {}) {
  const base = normalizeBaseUrl(cfg);
  const timeoutMs = Number(cfg.status_timeout_ms || 5000);
  const status = { base_url: base, online: false, version: null, models: [], default_model: cfg.default_model || 'qwen3:0.6b' };

  try {
    const version = await fetchJson(`${base}/api/version`, { method: 'GET' }, timeoutMs);
    status.version = version && version.version ? version.version : null;
    status.online = true;
  } catch (err) {
    status.error = err.message || String(err);
    return status;
  }

  try {
    const tags = await fetchJson(`${base}/api/tags`, { method: 'GET' }, timeoutMs);
    status.models = Array.isArray(tags && tags.models) ? tags.models.map(m => m.name).filter(Boolean) : [];
  } catch (err) {
    status.models_error = err.message || String(err);
  }

  return status;
}

async function chat({ cfg = {}, model, messages }) {
  const base = normalizeBaseUrl(cfg);
  const timeoutMs = Number(cfg.chat_timeout_ms || 120000);
  const body = {
    model: model || cfg.default_model || 'qwen3:0.6b',
    messages,
    stream: false,
    options: {
      temperature: Number(cfg.temperature ?? 0.7),
      num_ctx: Number(cfg.num_ctx || 4096)
    }
  };

  const raw = await fetchJson(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, timeoutMs);

  const reply = raw && raw.message && typeof raw.message.content === 'string'
    ? raw.message.content.trim()
    : '';
  if (!reply) throw new Error('Ollama respondeu vazio. Verifique o modelo carregado.');
  return { reply, raw };
}

module.exports = { getStatus, chat, normalizeBaseUrl };
