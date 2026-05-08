'use strict';
window.NoellePages = window.NoellePages || {};

window.NoellePages.renderChatPage = function renderChatPage(root, utils) {
  root.innerHTML = `
    <div class="chat-layout">
      <div class="chat-panel card">
        <div id="messages" class="messages"></div>
        <form id="chatForm" class="chat-form">
          <input id="modelInput" class="model-input" placeholder="modelo" value="qwen3:0.6b" />
          <textarea id="messageInput" rows="2" placeholder="Digite para testar a Yoru/Noelle..."></textarea>
          <button id="sendBtn" type="submit">Enviar</button>
        </form>
      </div>
      <aside class="side-card card">
        <h3>Fase atual</h3>
        <p><b>Objetivo:</b> validar Electron + IPC + Ollama.</p>
        <p><b>Sem voz ainda:</b> STT/TTS entram depois.</p>
        <button id="quickOi" class="ghost-btn full">Teste: oi</button>
        <button id="statusBtn" class="ghost-btn full">Status Ollama</button>
        <pre id="debugBox" class="debug-box">pronto</pre>
      </aside>
    </div>
  `;

  const messages = root.querySelector('#messages');
  const form = root.querySelector('#chatForm');
  const input = root.querySelector('#messageInput');
  const modelInput = root.querySelector('#modelInput');
  const sendBtn = root.querySelector('#sendBtn');
  const debugBox = root.querySelector('#debugBox');
  const quickOi = root.querySelector('#quickOi');
  const statusBtn = root.querySelector('#statusBtn');

  function addMessage(role, text, meta) {
    const item = document.createElement('div');
    item.className = `msg ${role}`;
    item.innerHTML = `
      <div class="msg-role">${role === 'user' ? 'Voce' : 'Yoru'}</div>
      <div class="msg-text"></div>
      ${meta ? `<div class="msg-meta">${utils.escapeHtml(meta)}</div>` : ''}
    `;
    item.querySelector('.msg-text').textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  async function send(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    addMessage('user', clean);
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Pensando...';
    utils.setStatus('warn', 'Ollama pensando');
    debugBox.textContent = 'enviando para Ollama...';

    const result = await window.noelle.ai.chat({ text: clean, model: modelInput.value.trim() });
    if (!result.ok) {
      addMessage('assistant', `Falha: ${result.error}`);
      debugBox.textContent = JSON.stringify(result, null, 2);
      utils.setStatus('bad', 'erro no chat');
    } else if (result.ignored) {
      addMessage('assistant', result.reply || 'Ignorado.');
      debugBox.textContent = JSON.stringify(result, null, 2);
      utils.setStatus('ok', 'ignorado');
    } else {
      addMessage('assistant', result.reply, `${result.model || 'modelo'} • ${result.ms || '?'}ms`);
      debugBox.textContent = JSON.stringify({ model: result.model, ms: result.ms }, null, 2);
      utils.setStatus('ok', 'resposta pronta');
    }

    sendBtn.disabled = false;
    sendBtn.textContent = 'Enviar';
    input.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });
  quickOi.addEventListener('click', () => send('oi, Yoru. Responda curto para testar se o chat texto esta funcionando.'));
  statusBtn.addEventListener('click', async () => {
    utils.setStatus('warn', 'checando Ollama');
    const result = await window.noelle.ai.status();
    debugBox.textContent = JSON.stringify(result, null, 2);
    utils.setStatus(result.ok && result.status && result.status.online ? 'ok' : 'bad', result.ok && result.status && result.status.online ? 'Ollama online' : 'Ollama offline');
  });

  addMessage('assistant', 'Base v20 carregada. Primeiro teste: envie uma mensagem curta para validar o Ollama.');
  input.focus();
};
