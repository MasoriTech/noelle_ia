const http = require('http');

function requestJson(url, payload, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ response: body }); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Ollama demorou demais para responder')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function chatWithOllama({ message, options = {} }) {
  if (!message || !String(message).trim()) return { ok: false, text: 'Mensagem vazia.' };
  const model = options.model || 'qwen3:0.6b';
  try {
    const res = await requestJson('http://127.0.0.1:11434/api/generate', {
      model,
      prompt: String(message),
      stream: false
    });
    return { ok: true, model, text: res.response || '' };
  } catch (error) {
    return { ok: false, model, text: 'Ollama nao respondeu. Verifique se o Ollama esta aberto.', error: error.message };
  }
}

module.exports = { chatWithOllama };
