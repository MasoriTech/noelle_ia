(() => {
  "use strict";

  const PATCH_NAME = "noelle-chat-moderno-2026-v6";
  const HISTORY_KEY = "noelle_core_chat_history_v1";

  const byId = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);

  function asText(value) {
    return String(value ?? "").trim();
  }

  function removeLegacyPatchTags() {
    document
      .querySelectorAll('link[href*="noelle_chat_focus_patch"], link[href*="noelle_chat_safe_repair"], script[src*="noelle_chat_focus_patch"], script[src*="noelle_chat_safe_repair"]')
      .forEach((node) => node.remove());
  }

  function take(id) {
    const node = byId(id);
    if (!node) return null;
    node.remove();
    return node;
  }

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function addControlLine(group, label, element) {
    if (!element) return;
    const line = make("label", "noelle-chat-modern-control-line");
    const span = make("span", "", label);
    line.append(span, element);
    group.appendChild(line);
  }

  function addButton(buttonRow, button) {
    if (!button) return;
    buttonRow.appendChild(button);
  }

  function autoGrowTextarea(input) {
    if (!input) return;
    const resize = () => {
      input.style.height = "48px";
      const next = Math.min(input.scrollHeight, 132);
      input.style.height = Math.max(48, next) + "px";
    };
    input.addEventListener("input", resize, { passive: true });
    setTimeout(resize, 0);
  }

  function scrollChatToBottom(log, instant = false) {
    if (!log) return;
    try {
      log.scrollTo({ top: log.scrollHeight, behavior: instant ? "auto" : "smooth" });
    } catch {
      log.scrollTop = log.scrollHeight;
    }
  }

  function inferStatusText(statusNode, runtimeNode) {
    const status = asText(statusNode?.textContent);
    const runtime = asText(runtimeNode?.textContent);
    if (status && runtime) return `${status} · ${runtime}`;
    return status || runtime || "NoelleCore pronta";
  }

  function decorateExistingMessages(log) {
    if (!log) return;
    Array.from(log.children).forEach((child) => {
      const text = child.textContent || "";
      if (/\bVocê\b|\bVoce\b/i.test(text)) child.dataset.role = child.dataset.role || "user";
      if (/\bNoelle\b/i.test(text)) child.dataset.role = child.dataset.role || "assistant";
      if (/\bSistema\b|Falha na IA|Ollama/i.test(text)) child.dataset.role = child.dataset.role || "system";
    });
  }

  function installModernChatLayout() {
    removeLegacyPatchTags();

    const panel = qs('[data-tab-panel="chat"]');
    const existingLog = byId("coreChatLog");
    const existingInput = byId("coreChatInput");
    const existingSend = byId("coreSendBtn");

    if (!panel || !existingLog || !existingInput || !existingSend) return false;
    if (!panel.contains(existingLog) || !panel.contains(existingInput) || !panel.contains(existingSend)) return false;
    if (panel.dataset.noelleModernChatReady === PATCH_NAME) {
      scrollChatToBottom(existingLog, true);
      return true;
    }

    const wasActive = panel.classList.contains("active");

    // Move elementos existentes para preservar os listeners já criados pelo bundle.
    const log = take("coreChatLog");
    const input = take("coreChatInput");
    const send = take("coreSendBtn");
    const mic = take("coreMicBtn");

    const statusLine = take("coreStatusLine") || take("coreChatStatus") || take("coreStatusBadge");
    const runtimeLine = take("coreRuntimeLine") || take("coreRuntimeStatus") || take("coreChatRuntime");

    const modelSelect = take("coreModelSelect");
    const profileSelect = take("coreProfileSelect");
    const personaSelect = take("corePersonaSelect");

    const sttModel = take("coreSttModelSelect");
    const sttCompute = take("coreSttComputeSelect");
    const sttLanguage = take("coreSttLanguageSelect");
    const sttSeconds = take("coreSttRecordSecondsSelect");

    const resetBtn = take("coreResetBtn");
    const rememberBtn = take("coreRememberBtn");
    const memoriesBtn = take("coreMemoriesBtn");
    const forgetBtn = take("coreForgetMemoryBtn");
    const clearMemoriesBtn = take("coreClearMemoriesBtn");

    const statusBtn = take("coreStatusBtn");
    const diagnosticBtn = take("coreDiagnosticBtn");
    const preloadBtn = take("corePreloadBtn");
    const unloadBtn = take("coreUnloadBtn");
    const benchBtn = take("coreBenchBtn");
    const sttStatusBtn = take("coreSttStatusBtn");
    const sttStopBtn = take("coreSttStopBtn");

    const shell = make("div", "noelle-chat-modern-shell");

    const header = make("div", "noelle-chat-modern-header");
    const title = make("div", "noelle-chat-modern-title");
    const titleStrong = make("strong", "", "Chat IA");
    const titleSub = make("span", "", "NoelleCore local com Ollama · layout moderno");
    title.append(titleStrong, titleSub);

    const status = make("div", "noelle-chat-modern-status");
    if (statusLine) status.appendChild(statusLine);
    if (runtimeLine) status.appendChild(runtimeLine);
    if (!status.children.length) status.textContent = "NoelleCore pronta";
    header.append(title, status);

    const messages = make("section", "noelle-chat-modern-messages");
    log.classList.add("noelle-modern-chat-log");
    decorateExistingMessages(log);
    messages.appendChild(log);

    const composer = make("form", "noelle-chat-modern-composer");
    composer.addEventListener("submit", (event) => {
      event.preventDefault();
      send?.click();
    });
    input.placeholder = input.placeholder || "Mensagem para Noelle...";
    input.setAttribute("aria-label", "Mensagem para Noelle");
    input.rows = 1;
    send.type = "submit";
    send.title = "Enviar mensagem";
    send.setAttribute("aria-label", "Enviar mensagem");
    if (mic) {
      mic.type = "button";
      mic.title = "Gravar áudio";
      mic.setAttribute("aria-label", "Gravar áudio");
    }
    composer.append(input, send);
    if (mic) composer.appendChild(mic);
    else composer.style.gridTemplateColumns = "minmax(0, 1fr) 48px";

    const settings = make("details", "noelle-chat-modern-settings");
    const summary = make("summary", "", "Configurações do Chat IA");
    const settingsBody = make("div", "noelle-chat-modern-settings-body");

    const modelGroup = make("div", "noelle-chat-modern-group");
    modelGroup.appendChild(make("p", "noelle-chat-modern-group-title", "Ollama"));
    addControlLine(modelGroup, "Modelo", modelSelect);
    addControlLine(modelGroup, "Perfil", profileSelect);
    addControlLine(modelGroup, "Persona", personaSelect);
    const ollamaButtons = make("div", "noelle-chat-modern-button-row");
    [statusBtn, diagnosticBtn, preloadBtn, unloadBtn, benchBtn].forEach((btn) => addButton(ollamaButtons, btn));
    modelGroup.appendChild(ollamaButtons);

    const memoryGroup = make("div", "noelle-chat-modern-group");
    memoryGroup.appendChild(make("p", "noelle-chat-modern-group-title", "Conversa e memória"));
    const memoryButtons = make("div", "noelle-chat-modern-button-row");
    [resetBtn, rememberBtn, memoriesBtn, forgetBtn, clearMemoriesBtn].forEach((btn) => addButton(memoryButtons, btn));
    memoryGroup.appendChild(memoryButtons);

    const audioGroup = make("div", "noelle-chat-modern-group");
    audioGroup.appendChild(make("p", "noelle-chat-modern-group-title", "Áudio / STT"));
    addControlLine(audioGroup, "Modelo", sttModel);
    addControlLine(audioGroup, "Compute", sttCompute);
    addControlLine(audioGroup, "Idioma", sttLanguage);
    addControlLine(audioGroup, "Duração", sttSeconds);
    const audioButtons = make("div", "noelle-chat-modern-button-row");
    [sttStatusBtn, sttStopBtn].forEach((btn) => addButton(audioButtons, btn));
    audioGroup.appendChild(audioButtons);

    [modelGroup, memoryGroup, audioGroup].forEach((group) => {
      if (group.querySelector("select,button")) settingsBody.appendChild(group);
    });
    settings.append(summary, settingsBody);

    // Guarda sobras do HTML antigo em vez de deixar ocuparem espaço/scroll.
    const legacy = make("div", "noelle-chat-modern-hidden-original");
    Array.from(panel.childNodes).forEach((node) => legacy.appendChild(node));

    shell.append(header, messages, composer, settings, legacy);
    panel.replaceChildren(shell);
    panel.classList.add("noelle-chat-modern-panel");
    panel.dataset.noelleModernChatReady = PATCH_NAME;
    if (wasActive) panel.classList.add("active");

    autoGrowTextarea(input);
    decorateExistingMessages(log);
    scrollChatToBottom(log, true);

    const observer = new MutationObserver(() => {
      decorateExistingMessages(log);
      scrollChatToBottom(log);
    });
    observer.observe(log, { childList: true, subtree: true });

    // Reaplica ao entrar na aba Chat IA, pois o app antigo mexe no scroll.
    document.querySelectorAll("[data-tab-target='chat']").forEach((btn) => {
      btn.addEventListener("click", () => setTimeout(() => scrollChatToBottom(log, true), 80));
    });

    // Mostra erro do Ollama de forma limpa, sem quebrar layout.
    const refreshHeaderStatus = () => {
      const next = inferStatusText(statusLine, runtimeLine);
      if (!statusLine && !runtimeLine) status.textContent = next;
    };
    setInterval(refreshHeaderStatus, 2000);

    console.info(`[${PATCH_NAME}] Layout moderno instalado.`);
    return true;
  }

  function boot() {
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (installModernChatLayout()) return;
      if (tries < 80) setTimeout(tick, 100);
      else console.warn(`[${PATCH_NAME}] Não encontrei coreChatLog/coreChatInput/coreSendBtn para reorganizar.`);
    };
    tick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
