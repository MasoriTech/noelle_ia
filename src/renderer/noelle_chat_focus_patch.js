// Hotfix visual e de UX para a aba Chat IA atual.
// Nao substitui o renderer original; apenas adiciona classe, autoscroll e aviso amigavel.
(() => {
  const $ = (id) => document.getElementById(id);

  function isChatActive() {
    const panel = document.querySelector('[data-tab-panel="chat"]');
    return !!panel && panel.classList.contains('active');
  }

  function syncBodyClass() {
    document.body.classList.toggle('noelle-chat-focus-patch', isChatActive());
  }

  function scrollChatToBottom() {
    const log = $('coreChatLog');
    if (log) log.scrollTop = log.scrollHeight;
  }

  function patchEnsureDirOldMessage() {
    const log = $('coreChatLog');
    if (!log || log.dataset.noelleEnsureDirNotice === '1') return;
    if (!/ensureDir is not defined/i.test(log.textContent || '')) return;
    const banner = document.createElement('div');
    banner.className = 'noelle-chat-hotfix-banner';
    banner.textContent = 'Aviso: havia uma mensagem antiga de erro ensureDir. O hotfix corrige a função no main.js; limpe a conversa se quiser remover o histórico antigo.';
    log.prepend(banner);
    log.dataset.noelleEnsureDirNotice = '1';
  }

  function installObservers() {
    const log = $('coreChatLog');
    if (log && !log.dataset.noelleAutoScroll) {
      const mo = new MutationObserver(() => {
        patchEnsureDirOldMessage();
        scrollChatToBottom();
      });
      mo.observe(log, { childList: true, subtree: true, characterData: true });
      log.dataset.noelleAutoScroll = '1';
    }

    const root = document.body;
    if (!root.dataset.noelleChatPatchObserver) {
      const mo = new MutationObserver(() => {
        syncBodyClass();
        patchEnsureDirOldMessage();
      });
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      root.dataset.noelleChatPatchObserver = '1';
    }
  }

  function boot() {
    syncBodyClass();
    installObservers();
    patchEnsureDirOldMessage();
    scrollChatToBottom();
    document.querySelectorAll('[data-tab-target="chat"]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(() => {
        syncBodyClass();
        scrollChatToBottom();
      }, 60));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
