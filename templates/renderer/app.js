'use strict';

const pageRoot = document.getElementById('pageRoot');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const appStatusDot = document.getElementById('appStatusDot');
const appStatusText = document.getElementById('appStatusText');
const diagBtn = document.getElementById('diagBtn');

const pages = {
  chat: {
    title: 'Chat',
    subtitle: 'Chat texto com Ollama. Voz e avatar entram depois.',
    render: window.NoellePages.renderChatPage
  },
  voice: {
    title: 'Voz IA',
    subtitle: 'Placeholder da proxima fase: STT, VAD 5s e TTS com fila.',
    render: () => placeholder('Voz IA', 'Aqui vai entrar o fluxo: capturar audio → VAD 5s → STT → Ollama → TTS por frases.')
  },
  avatar: {
    title: 'Avatar',
    subtitle: 'Placeholder para estados: idle, listening, thinking, speaking e error.',
    render: () => placeholder('Avatar', 'Depois do chat/voz estavel, o avatar recebe estados sem derrubar a IA.')
  },
  stream: {
    title: 'Stream',
    subtitle: 'Placeholder para a aba Stream isolada.',
    render: () => placeholder('Stream', 'A Stream volta por ultimo, conectada a estados e audio, sem misturar com o chat.')
  },
  settings: {
    title: 'Config',
    subtitle: 'Config basica de Ollama/modelo.',
    render: window.NoellePages.renderSettingsPage
  }
};

function placeholder(title, text) {
  pageRoot.innerHTML = `
    <div class="card empty-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      <p class="hint">Esta fase esta separada de proposito para nao quebrar o app inteiro.</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function setStatus(kind, text) {
  appStatusDot.className = `dot ${kind || 'warn'}`;
  appStatusText.textContent = text || 'status';
}

function showPage(name) {
  const page = pages[name] || pages.chat;
  pageTitle.textContent = page.title;
  pageSubtitle.textContent = page.subtitle;
  page.render(pageRoot, { setStatus, escapeHtml });
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === name));
}

document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));

diagBtn.addEventListener('click', async () => {
  setStatus('warn', 'diagnosticando');
  const result = await window.noelle.ai.status();
  if (!result.ok || !result.status || !result.status.online) {
    setStatus('bad', 'Ollama offline');
    alert(`Ollama offline ou inacessivel.\n\n${result.error || (result.status && result.status.error) || 'Sem detalhes.'}`);
    return;
  }
  setStatus('ok', 'Ollama online');
  alert(`Ollama online.\nVersao: ${result.status.version || 'desconhecida'}\nModelos: ${(result.status.models || []).join(', ') || 'nenhum listado'}`);
});

(async () => {
  try {
    const info = await window.noelle.app.info();
    setStatus(info.ok ? 'ok' : 'warn', info.ok ? 'app pronto' : 'app com aviso');
  } catch {
    setStatus('bad', 'preload falhou');
  }
  showPage('chat');
})();
