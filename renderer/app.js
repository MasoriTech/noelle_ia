import { renderChatPage } from './pages/chat_page.js';
import { renderVoicePage } from './pages/voice_page.js';
import { renderAvatarPage } from './pages/avatar_page.js';
import { renderStreamPage } from './pages/stream_page.js';
import { renderSettingsPage } from './pages/settings_page.js';

const pageRoot = document.querySelector('#page-root');
const statusBar = document.querySelector('#status-bar');

const pages = {
  chat: renderChatPage,
  voice: renderVoicePage,
  avatar: renderAvatarPage,
  stream: renderStreamPage,
  settings: renderSettingsPage
};

function setStatus(text) {
  statusBar.textContent = text;
}

function navigate(page) {
  const render = pages[page] || pages.chat;
  pageRoot.innerHTML = '';
  render(pageRoot, { setStatus });
}

for (const btn of document.querySelectorAll('[data-page]')) {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const status = await window.noelle.app.status();
    setStatus(status.ok ? 'Noelle pronta' : 'Noelle com aviso');
  } catch (error) {
    setStatus('Erro ao consultar status');
  }
  navigate('chat');
});
