'use strict';
window.NoellePages = window.NoellePages || {};

window.NoellePages.renderSettingsPage = function renderSettingsPage(root, utils) {
  root.innerHTML = `
    <div class="card settings-card">
      <h3>Config Ollama</h3>
      <label>URL do Ollama</label>
      <input id="ollamaUrl" value="http://127.0.0.1:11434" />
      <label>Modelo padrao</label>
      <input id="defaultModel" value="qwen3:0.6b" />
      <label>Timeout chat ms</label>
      <input id="chatTimeout" type="number" value="120000" />
      <div class="row-actions">
        <button id="saveCfg">Salvar</button>
        <button id="loadCfg" class="ghost-btn">Recarregar</button>
      </div>
      <pre id="cfgDebug" class="debug-box">config</pre>
    </div>
  `;
  const ollamaUrl = root.querySelector('#ollamaUrl');
  const defaultModel = root.querySelector('#defaultModel');
  const chatTimeout = root.querySelector('#chatTimeout');
  const cfgDebug = root.querySelector('#cfgDebug');

  async function load() {
    const res = await window.noelle.config.read('models');
    const cfg = res.config || {};
    ollamaUrl.value = cfg.ollama_url || 'http://127.0.0.1:11434';
    defaultModel.value = cfg.default_model || 'qwen3:0.6b';
    chatTimeout.value = cfg.chat_timeout_ms || 120000;
    cfgDebug.textContent = JSON.stringify(res, null, 2);
  }

  root.querySelector('#loadCfg').addEventListener('click', load);
  root.querySelector('#saveCfg').addEventListener('click', async () => {
    const cfg = {
      ollama_url: ollamaUrl.value.trim() || 'http://127.0.0.1:11434',
      default_model: defaultModel.value.trim() || 'qwen3:0.6b',
      status_timeout_ms: 5000,
      chat_timeout_ms: Number(chatTimeout.value || 120000),
      temperature: 0.7,
      num_ctx: 4096
    };
    const res = await window.noelle.config.write('models', cfg);
    cfgDebug.textContent = JSON.stringify(res, null, 2);
    utils.setStatus(res.ok ? 'ok' : 'bad', res.ok ? 'config salva' : 'erro config');
  });

  load();
};
