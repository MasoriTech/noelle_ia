const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');

const OLLAMA_HOST = process.env.OLLAMA_HOST || '127.0.0.1';
const OLLAMA_PORT = Number(process.env.OLLAMA_PORT || 11434);

function ollamaRequest(method, endpoint, body, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: endpoint,
      method,
      timeout: timeoutMs,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : {}; } catch (_) {}
        if (res.statusCode >= 400) {
          reject(new Error((json && (json.error || json.message)) || `HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        resolve(json || { raw: data });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout depois de ${Math.round(timeoutMs/1000)}s`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getStatus() {
  try {
    const tags = await ollamaRequest('GET', '/api/tags', null, 4000);
    const models = Array.isArray(tags.models) ? tags.models.map(m => m.name).filter(Boolean) : [];
    return { ok: true, online: true, host: `${OLLAMA_HOST}:${OLLAMA_PORT}`, models };
  } catch (err) {
    return { ok: false, online: false, host: `${OLLAMA_HOST}:${OLLAMA_PORT}`, error: err.message || String(err) };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 820,
    minHeight: 560,
    title: 'Noelle Chat IA Limpo',
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0b0b12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'chat.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('noelle:status', getStatus);
  ipcMain.handle('noelle:openOllamaDownload', async () => {
    await shell.openExternal('https://ollama.com/download');
    return { ok: true };
  });
  ipcMain.handle('noelle:chat', async (_event, payload = {}) => {
    const model = String(payload.model || 'qwen3:0.6b').trim();
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-24) : [];
    if (!messages.length) throw new Error('mensagem vazia');
    const started = Date.now();
    const result = await ollamaRequest('POST', '/api/chat', {
      model,
      messages,
      stream: false,
      options: {
        temperature: Number(payload.temperature ?? 0.7),
        num_ctx: Number(payload.num_ctx ?? 2048),
      },
    }, Number(payload.timeoutMs || 300000));
    const content = result && result.message && typeof result.message.content === 'string'
      ? result.message.content
      : '';
    return {
      ok: true,
      content: content || '[sem resposta do modelo]',
      seconds: ((Date.now() - started) / 1000).toFixed(2),
      model,
      rawMetrics: {
        total_duration: result.total_duration,
        load_duration: result.load_duration,
        prompt_eval_count: result.prompt_eval_count,
        eval_count: result.eval_count,
      },
    };
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
