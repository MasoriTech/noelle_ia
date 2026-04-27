/*
  Noelle Chat UI V12
  Reorganiza somente a aba Chat IA, preservando os elementos e handlers antigos.
*/
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const byId = (id) => document.getElementById(id);

  function textOf(el) {
    return String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findButtonByText(root, pattern) {
    return $$('button', root).find((button) => pattern.test(textOf(button)));
  }

  function findChatPanel() {
    const direct = $('[data-tab-panel="chat"], [data-panel="chat"], #chatPanel, #chatTab, .chat-panel');
    if (direct) return direct;

    const anchors = [
      byId('coreChatLog'),
      byId('coreChatInput'),
      byId('coreSendBtn'),
      byId('noelleCoreStatus'),
      byId('coreModelSelect'),
      findButtonByText(document, /^Enviar$/i),
    ].filter(Boolean);

    for (const anchor of anchors) {
      const panel = anchor.closest('[data-tab-panel], [data-panel], section, main, article, .panel, .tab-panel, .page, .card');
      if (panel && /chat|ollama|noellecore|persona/i.test(textOf(panel))) return panel;
    }

    return $$('[data-tab-panel], [data-panel], section, main, article, .panel, .tab-panel, .page, .card')
      .find((candidate) => /Chat IA|NoelleCore|Ollama/i.test(textOf(candidate))) || null;
  }

  function findInput(panel) {
    return byId('coreChatInput') ||
      $('[data-chat-input]', panel) ||
      $('textarea[placeholder*="Noelle" i]', panel) ||
      $('input[placeholder*="Noelle" i]', panel) ||
      $('textarea', panel) ||
      $('input[type="text"]', panel);
  }

  function findLog(panel) {
    return byId('coreChatLog') ||
      $('[data-chat-log]', panel) ||
      $('[id*="ChatLog" i]', panel) ||
      $('[class*="chat-log" i]', panel) ||
      $('[class*="messages" i]', panel) ||
      $$('div,section,article', panel).find((el) => /Pronto\.|Noelle pronta|Você|Noelle/i.test(textOf(el)) && el.scrollHeight >= el.clientHeight);
  }

  function findSend(panel) {
    return byId('coreSendBtn') ||
      $('[data-chat-send]', panel) ||
      findButtonByText(panel, /^Enviar$/i) ||
      findButtonByText(panel, /Enviar/i);
  }

  function findMic(panel) {
    return byId('coreMicBtn') ||
      $('[data-chat-mic]', panel) ||
      findButtonByText(panel, /🎙|microfone|mic|gravar|áudio|audio/i);
  }

  function findStatus(panel) {
    return byId('noelleCoreStatus') ||
      byId('coreStatus') ||
      byId('coreChatStatus') ||
      $('[data-chat-status]', panel) ||
      $$('[id*="status" i], [class*="status" i]', panel).find((el) => /NoelleCore|Ollama|online|aguardando|pronto|erro|offline/i.test(textOf(el)));
  }

  function keepNode(node) {
    return node && node.nodeType === Node.ELEMENT_NODE;
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function scrollToBottom(log) {
    if (!log) return;
    requestAnimationFrame(() => {
      try { log.scrollTop = log.scrollHeight; } catch {}
    });
  }

  function installMutationScroll(log) {
    if (!log || log.dataset.noelleV12Observed === '1') return;
    log.dataset.noelleV12Observed = '1';
    const observer = new MutationObserver(() => {
      scrollToBottom(log);
      window.dispatchEvent(new CustomEvent('noelle:v12-chat-updated'));
    });
    observer.observe(log, { childList: true, subtree: true, characterData: true });
  }

  function moveIfPresent(parent, node) {
    if (node && node.parentElement !== parent) parent.appendChild(node);
  }

  function applyChatV12() {
    const panel = findChatPanel();
    if (!panel) return false;
    if (panel.dataset.noelleChatV12 === '1') return true;

    const log = findLog(panel);
    const input = findInput(panel);
    const send = findSend(panel);
    const mic = findMic(panel);
    const status = findStatus(panel);

    if (!log || !input || !send) {
      console.warn('[Noelle UI V12] Chat incompleto; nao reorganizei para evitar quebrar handlers.', { log, input, send });
      return false;
    }

    panel.dataset.noelleChatV12 = '1';
    panel.classList.add('noelle-chat-v12-panel');
    document.body.classList.add('noelle-chat-v12-ready');

    const originalChildren = Array.from(panel.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE);

    const shell = createEl('div', 'noelle-chat-v12');
    const header = createEl('div', 'noelle-chat-v12-header');
    const title = createEl('div', 'noelle-chat-v12-title');
    title.innerHTML = '<strong>Chat IA</strong><span>NoelleCore / Ollama</span>';
    const statusBox = createEl('div', 'noelle-chat-v12-status');
    const messages = createEl('div', 'noelle-chat-v12-messages');
    const composer = createEl('div', 'noelle-chat-v12-composer');
    const settings = createEl('details', 'noelle-chat-v12-settings');
    const summary = createEl('summary', '', 'Configurações do Chat IA');
    const settingsBody = createEl('div', 'noelle-chat-v12-settings-body');

    settings.append(summary, settingsBody);
    header.append(title, statusBox);
    shell.append(header, messages, composer, settings);

    panel.appendChild(shell);

    if (status && keepNode(status)) {
      moveIfPresent(statusBox, status);
    } else {
      statusBox.textContent = 'Status do chat';
    }

    log.classList.add('noelle-chat-v12-log');
    input.classList.add('noelle-chat-v12-input');
    send.classList.add('noelle-chat-v12-send');
    send.setAttribute('title', send.getAttribute('title') || 'Enviar mensagem');
    send.setAttribute('aria-label', send.getAttribute('aria-label') || 'Enviar mensagem');

    if (mic && mic !== send) {
      mic.classList.add('noelle-chat-v12-mic');
      mic.setAttribute('title', mic.getAttribute('title') || 'Microfone / áudio');
      mic.setAttribute('aria-label', mic.getAttribute('aria-label') || 'Microfone / áudio');
    }

    moveIfPresent(messages, log);
    moveIfPresent(composer, input);
    if (mic && mic !== send) moveIfPresent(composer, mic);
    moveIfPresent(composer, send);

    // Tudo que sobrou da aba Chat vai para Configurações. Isso preserva selects/botoes antigos.
    for (const child of originalChildren) {
      if (child === shell || shell.contains(child)) continue;
      if (child.isConnected) settingsBody.appendChild(child);
    }

    if (!settingsBody.children.length) {
      settingsBody.appendChild(createEl('span', 'noelle-chat-v12-legacy-empty', 'Sem controles extras encontrados.'));
    }

    installMutationScroll(log);
    scrollToBottom(log);
    return true;
  }

  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ok = applyChatV12();
      if (ok || tries >= 20) clearInterval(timer);
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
