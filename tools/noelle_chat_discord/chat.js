(() => {
  const api = window.noelleChat;
  const $ = (id) => document.getElementById(id);
  const messageList = $('messageList');
  const input = $('messageInput');
  const form = $('chatForm');
  const sendBtn = $('sendBtn');
  const toastEl = $('toast');

  let config = {
    model: 'qwen3:0.6b',
    profile: 'turbo',
    persona: 'nobre',
    sessionId: 'noelle_chat_main',
  };
  let busy = false;

  function nowTime() {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function toast(text, tone = 'normal') {
    toastEl.textContent = text;
    toastEl.dataset.tone = tone;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function appendMessage(role, content, at = null) {
    const div = document.createElement('article');
    div.className = `message ${role}`;
    if (role === 'system') {
      div.textContent = content;
      messageList.appendChild(div);
      scrollDown();
      return div;
    }
    const isUser = role === 'user';
    const name = isUser ? 'Você' : 'Noelle';
    const avatar = isUser ? 'V' : 'N';
    div.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-main">
        <div class="msg-head"><span class="msg-name">${name}</span><span class="msg-time">${at || nowTime()}</span></div>
        <div class="msg-body">${escapeText(content)}</div>
      </div>
    `;
    messageList.appendChild(div);
    scrollDown();
    return div;
  }

  function appendTyping() {
    const el = appendMessage('assistant', 'Pensando');
    el.classList.add('typing');
    return el;
  }

  function scrollDown() {
    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
  }

  function setBusy(value) {
    busy = !!value;
    sendBtn.disabled = busy;
    input.disabled = busy;
    sendBtn.textContent = busy ? 'Enviando...' : 'Enviar';
  }

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }

  function renderHistory(history = []) {
    messageList.innerHTML = '';
    if (!history.length) {
      appendMessage('system', 'Noelle pronta. Abra o Ollama, baixe qwen3:0.6b e converse aqui sem poluir a janela do avatar.');
      return;
    }
    for (const item of history) {
      const time = item.at ? new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
      appendMessage(item.role, item.content, time);
    }
  }

  async function loadState() {
    try {
      const res = await api.getState();
      if (!res?.ok) throw new Error('Falha ao carregar estado.');
      config = { ...config, ...(res.config || {}) };
      $('modelInput').value = config.model || 'qwen3:0.6b';
      $('profileSelect').value = config.profile || 'turbo';
      $('personaSelect').value = config.persona || 'nobre';
      updateMeta();
      renderHistory(res.history || []);
      await refreshStatus(false);
    } catch (err) {
      appendMessage('system', 'Erro ao iniciar a UI do chat: ' + (err.message || err));
    }
  }

  function updateMeta() {
    $('miniMeta').textContent = `${config.model || 'qwen3:0.6b'} · ${config.profile || 'turbo'}`;
  }

  async function saveConfig(patch = {}) {
    config = { ...config, ...patch };
    const res = await api.setConfig(config);
    if (res?.ok) {
      config = { ...config, ...res.config };
      updateMeta();
    }
    return res;
  }

  async function refreshStatus(showToast = true) {
    const pill = $('onlinePill');
    pill.textContent = 'checando';
    pill.className = 'online-pill warn';
    try {
      const res = await api.status();
      const lines = [
        `Ollama online: ${res.ollamaOnline ? 'sim' : 'não'}`,
        `Modelo ativo: ${res.model}`,
        `Modelo instalado: ${res.activeModelInstalled ? 'sim' : 'não'}`,
        `Modelo carregado: ${res.activeModelLoaded ? 'sim' : 'não'}`,
        `Perfil: ${res.profile}`,
        `Persona: ${res.persona}`,
        '',
        `Instalados: ${(res.installed || []).join(', ') || 'nenhum detectado'}`,
        `Carregados: ${(res.loaded || []).join(', ') || 'nenhum'}`,
      ];
      if (res.error) lines.push('', 'Erro: ' + res.error);
      if (res.hint) lines.push('Dica: ' + res.hint);
      $('statusBox').textContent = lines.join('\n');
      if (res.ollamaOnline && res.activeModelInstalled) {
        pill.textContent = res.activeModelLoaded ? 'online' : 'modelo ok';
        pill.className = 'online-pill ok';
      } else if (res.ollamaOnline) {
        pill.textContent = 'sem modelo';
        pill.className = 'online-pill warn';
      } else {
        pill.textContent = 'offline';
        pill.className = 'online-pill error';
      }
      if (showToast) toast(res.ollamaOnline ? 'Status atualizado.' : (res.hint || 'Ollama offline.'), res.ollamaOnline ? 'ok' : 'error');
      return res;
    } catch (err) {
      pill.textContent = 'erro';
      pill.className = 'online-pill error';
      $('statusBox').textContent = 'Falha ao consultar status: ' + (err.message || err);
      if (showToast) toast('Falha no status do Ollama.', 'error');
      return null;
    }
  }

  async function sendMessage() {
    if (busy) return;
    const message = input.value.trim();
    if (!message) return;

    if (message === '/reset') {
      await resetChat();
      input.value = '';
      autoResize();
      return;
    }
    if (message === '/status') {
      switchView('status');
      await refreshStatus(true);
      input.value = '';
      autoResize();
      return;
    }
    if (message.startsWith('/mem ')) {
      await remember(message.slice(5));
      input.value = '';
      autoResize();
      return;
    }

    appendMessage('user', message);
    input.value = '';
    autoResize();
    setBusy(true);
    const typing = appendTyping();
    try {
      const res = await api.chat({ message, config });
      typing.remove();
      if (!res?.ok) {
        appendMessage('system', `Erro: ${res?.error || 'falha desconhecida'}${res?.hint ? '\nDica: ' + res.hint : ''}`);
        toast(res?.hint || 'Falha ao responder.', 'error');
        return;
      }
      appendMessage('assistant', res.reply);
      const meta = res.metrics?.tokensPerSecond ? `${res.metrics.seconds}s · ${res.metrics.tokensPerSecond} tok/s` : `${res.metrics?.seconds || '?'}s`;
      toast(`Resposta OK: ${meta}`, 'ok');
    } catch (err) {
      typing.remove();
      appendMessage('system', 'Erro inesperado: ' + (err.message || err));
      toast('Erro inesperado no chat.', 'error');
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  async function resetChat() {
    const ok = confirm('Limpar o histórico desta conversa?');
    if (!ok) return;
    const res = await api.reset();
    if (res?.ok) {
      renderHistory([]);
      toast('Conversa limpa.', 'ok');
    }
  }

  async function preloadModel() {
    toast('Pré-carregando modelo...', 'normal');
    const res = await api.preload();
    if (res?.ok) {
      toast(`Modelo ${res.model} pré-carregado.`, 'ok');
      await refreshStatus(false);
    } else {
      toast(res?.hint || res?.error || 'Falha ao pré-carregar.', 'error');
    }
  }

  async function unloadModel() {
    const res = await api.unload();
    if (res?.ok) toast(`Modelo ${res.model} descarregado.`, 'ok');
    else toast(res?.error || 'Falha ao descarregar modelo.', 'error');
    await refreshStatus(false);
  }

  async function remember(text) {
    const value = String(text || $('memoryInput').value || '').trim();
    if (!value) {
      toast('Digite uma memória primeiro.', 'error');
      return;
    }
    const res = await api.remember(value);
    if (res?.ok) {
      $('memoryBox').textContent = 'Memória salva:\n' + value;
      $('memoryInput').value = '';
      toast('Memória salva.', 'ok');
    } else {
      $('memoryBox').textContent = 'Erro: ' + (res?.error || 'falha desconhecida');
      toast('Falha ao salvar memória.', 'error');
    }
  }

  function switchView(view) {
    const map = {
      chat: ['viewChat', 'chat-principal', 'Conversa limpa, focada e rápida'],
      status: ['viewStatus', 'diagnostico', 'Ollama, modelo e carregamento'],
      memory: ['viewMemory', 'memorias', 'Memórias manuais locais'],
      settings: ['viewSettings', 'configuracoes', 'Modelo, perfil e persona'],
    };
    const target = map[view] ? view : 'chat';
    document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('[data-view]').forEach((el) => el.classList.remove('active'));
    $(map[target][0]).classList.add('active');
    document.querySelectorAll(`[data-view="${target}"]`).forEach((el) => el.classList.add('active'));
    $('roomTitle').textContent = map[target][1];
    $('roomSubtitle').textContent = map[target][2];
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });
  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', () => switchView(el.dataset.view));
  });

  $('btnStatus').addEventListener('click', async () => { switchView('status'); await refreshStatus(true); });
  $('btnPreload').addEventListener('click', preloadModel);
  $('btnUnload').addEventListener('click', unloadModel);
  $('btnReset').addEventListener('click', resetChat);
  $('btnOpenLogs').addEventListener('click', () => api.openPaths());
  $('btnAttachHint').addEventListener('click', () => toast('Anexos ficam para depois. Este pack foca em chat estável.', 'normal'));
  $('btnRemember').addEventListener('click', () => remember());
  $('btnDefaultModel').addEventListener('click', () => { $('modelInput').value = 'qwen3:0.6b'; toast('Modelo padrão preenchido.', 'ok'); });
  $('btnSaveConfig').addEventListener('click', async () => {
    const model = $('modelInput').value.trim() || 'qwen3:0.6b';
    const profile = $('profileSelect').value;
    const persona = $('personaSelect').value;
    await saveConfig({ model, profile, persona });
    toast('Configurações salvas.', 'ok');
    await refreshStatus(false);
  });
  $('profileSelect').addEventListener('change', async () => {
    await saveConfig({ profile: $('profileSelect').value });
    toast('Perfil atualizado.', 'ok');
  });
  $('personaSelect').addEventListener('change', async () => {
    await saveConfig({ persona: $('personaSelect').value });
    toast('Persona atualizada.', 'ok');
  });

  if (!api) {
    document.body.innerHTML = '<div style="padding:24px;color:white;font-family:sans-serif">Erro: preload do Noelle Chat não carregou.</div>';
    return;
  }
  loadState();
})();
