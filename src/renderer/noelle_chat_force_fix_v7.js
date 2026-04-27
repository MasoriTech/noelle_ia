(() => {
  "use strict";

  const PATCH = "noelle-chat-force-fix-v7";
  if (window.__NOELLE_CHAT_FORCE_FIX_V7_RUNNING__) return;
  window.__NOELLE_CHAT_FORCE_FIX_V7_RUNNING__ = true;

  const byId = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);

  function important(el, prop, value) {
    if (!el || !el.style) return;
    try { el.style.setProperty(prop, value, "important"); } catch (_) {}
  }

  function installCssFallback() {
    if (document.getElementById("noelle-chat-force-fix-v7-inline-style")) return;
    const style = document.createElement("style");
    style.id = "noelle-chat-force-fix-v7-inline-style";
    style.textContent = `
      [data-tab-panel="chat"].noelle-chat-force-v7-panel{height:calc(100vh - 218px)!important;max-height:calc(100vh - 218px)!important;min-height:430px!important;overflow:hidden!important;padding:12px!important;display:block!important}
      [data-tab-panel="chat"].noelle-chat-force-v7-panel:not(.active){display:none!important}
      .noelle-chat-force-v7-shell{height:100%!important;min-height:0!important;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto auto!important;gap:10px!important;overflow:hidden!important}
      .noelle-chat-force-v7-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;min-height:52px!important;padding:10px 14px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:18px!important;background:rgba(5,6,13,.52)!important;overflow:hidden!important}
      .noelle-chat-force-v7-messages{min-height:0!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:20px!important;background:rgba(6,7,15,.72)!important}
      #coreChatLog.noelle-chat-force-v7-log{height:100%!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;padding:16px!important;display:flex!important;flex-direction:column!important;gap:12px!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #coreChatInput.noelle-chat-force-v7-input{position:static!important;width:100%!important;min-height:44px!important;height:44px!important;max-height:118px!important;resize:none!important;overflow-y:auto!important;padding:12px 14px!important;border-radius:16px!important;transform:none!important}
      .noelle-chat-force-v7-composer{display:grid!important;grid-template-columns:minmax(0,1fr) 76px 48px!important;align-items:end!important;gap:10px!important;min-height:58px!important;padding:10px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:20px!important;background:rgba(5,6,13,.74)!important;overflow:hidden!important}
      .noelle-chat-force-v7-composer.no-mic{grid-template-columns:minmax(0,1fr) 76px!important}
      #coreSendBtn.noelle-chat-force-v7-send{position:static!important;width:76px!important;max-width:76px!important;height:44px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0 10px!important;border-radius:15px!important;transform:none!important}
      #coreMicBtn.noelle-chat-force-v7-mic{position:static!important;width:48px!important;max-width:48px!important;height:44px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:15px!important;transform:none!important}
      .noelle-chat-force-v7-hidden-original{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function take(id) {
    const node = byId(id);
    if (!node) return null;
    if (node.parentNode) node.parentNode.removeChild(node);
    return node;
  }

  function addControlLine(group, label, element) {
    if (!element) return;
    const line = make("label", "noelle-chat-force-v7-control-line");
    const span = make("span", "", label);
    line.append(span, element);
    group.appendChild(line);
  }

  function addButtons(group, buttons) {
    const row = make("div", "noelle-chat-force-v7-button-row");
    buttons.filter(Boolean).forEach((btn) => row.appendChild(btn));
    if (row.children.length) group.appendChild(row);
  }

  function decorateMessages(log) {
    if (!log) return;
    Array.from(log.children).forEach((child) => {
      const text = String(child.textContent || "");
      if (!child.dataset.role) {
        if (/\bVoc[eê]\b/i.test(text)) child.dataset.role = "user";
        else if (/\bNoelle\b/i.test(text)) child.dataset.role = "assistant";
        else if (/\bSistema\b|Falha na IA|Ollama|ECONNREFUSED/i.test(text)) child.dataset.role = "system";
      }
      important(child, "position", "static");
      important(child, "transform", "none");
      important(child, "margin", "0");
      important(child, "max-width", child.dataset.role === "system" ? "min(680px, 92%)" : "min(780px, 84%)");
      important(child, "width", "fit-content");
      important(child, "overflow-wrap", "anywhere");
      important(child, "white-space", "pre-wrap");
    });
  }

  function scrollBottom(log, instant = true) {
    if (!log) return;
    try {
      log.scrollTo({ top: log.scrollHeight, behavior: instant ? "auto" : "smooth" });
    } catch (_) {
      log.scrollTop = log.scrollHeight;
    }
  }

  function forceComposerStyles(input, send, mic, composer) {
    if (composer) {
      important(composer, "position", "static");
      important(composer, "display", "grid");
      important(composer, "grid-template-columns", mic ? "minmax(0, 1fr) 76px 48px" : "minmax(0, 1fr) 76px");
      important(composer, "gap", "10px");
      important(composer, "align-items", "end");
      important(composer, "overflow", "hidden");
    }
    if (input) {
      input.classList.add("noelle-chat-force-v7-input");
      input.rows = 1;
      input.placeholder = input.placeholder || "Mensagem para Noelle...";
      important(input, "position", "static");
      important(input, "width", "100%");
      important(input, "height", "44px");
      important(input, "min-height", "44px");
      important(input, "max-height", "118px");
      important(input, "resize", "none");
      important(input, "overflow-y", "auto");
      important(input, "transform", "none");
    }
    if (send) {
      send.classList.add("noelle-chat-force-v7-send");
      send.type = "button";
      if (/pensando/i.test(send.textContent || "")) {
        // mantém o texto de ocupado se já estiver processando
      } else {
        send.textContent = "Enviar";
      }
      important(send, "position", "static");
      important(send, "width", "76px");
      important(send, "max-width", "76px");
      important(send, "height", "44px");
      important(send, "min-width", "0");
      important(send, "min-height", "0");
      important(send, "margin", "0");
      important(send, "padding", "0 10px");
      important(send, "transform", "none");
    }
    if (mic) {
      mic.classList.add("noelle-chat-force-v7-mic");
      mic.type = "button";
      important(mic, "position", "static");
      important(mic, "width", "48px");
      important(mic, "max-width", "48px");
      important(mic, "height", "44px");
      important(mic, "min-width", "0");
      important(mic, "min-height", "0");
      important(mic, "margin", "0");
      important(mic, "padding", "0");
      important(mic, "transform", "none");
    }
  }

  function autogrow(input) {
    if (!input || input.dataset.ncf7Autogrow === "1") return;
    input.dataset.ncf7Autogrow = "1";
    const run = () => {
      input.style.setProperty("height", "44px", "important");
      const next = Math.min(Math.max(input.scrollHeight, 44), 118);
      input.style.setProperty("height", `${next}px`, "important");
    };
    input.addEventListener("input", run);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        byId("coreSendBtn")?.click();
      }
    });
    setTimeout(run, 20);
  }

  function statusText(statusLine, runtimeLine) {
    const a = String(statusLine?.textContent || "").trim();
    const b = String(runtimeLine?.textContent || "").trim();
    if (a && b) return `${a} · ${b}`;
    return a || b || "NoelleCore pronta";
  }

  function buildSettings() {
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

    const details = make("details", "noelle-chat-force-v7-settings");
    const summary = make("summary", "", "Configurações do Chat IA");
    const body = make("div", "noelle-chat-force-v7-settings-body");

    const ollama = make("div", "noelle-chat-force-v7-group");
    ollama.appendChild(make("p", "noelle-chat-force-v7-group-title", "Ollama"));
    addControlLine(ollama, "Modelo", modelSelect);
    addControlLine(ollama, "Perfil", profileSelect);
    addControlLine(ollama, "Persona", personaSelect);
    addButtons(ollama, [statusBtn, diagnosticBtn, preloadBtn, unloadBtn, benchBtn]);

    const memory = make("div", "noelle-chat-force-v7-group");
    memory.appendChild(make("p", "noelle-chat-force-v7-group-title", "Conversa"));
    addButtons(memory, [resetBtn, rememberBtn, memoriesBtn, forgetBtn, clearMemoriesBtn]);

    const audio = make("div", "noelle-chat-force-v7-group");
    audio.appendChild(make("p", "noelle-chat-force-v7-group-title", "Áudio / STT"));
    addControlLine(audio, "Modelo", sttModel);
    addControlLine(audio, "Compute", sttCompute);
    addControlLine(audio, "Idioma", sttLanguage);
    addControlLine(audio, "Tempo", sttSeconds);
    addButtons(audio, [sttStatusBtn, sttStopBtn]);

    [ollama, memory, audio].forEach((group) => {
      if (group.querySelector("select, button")) body.appendChild(group);
    });

    details.append(summary, body);
    return details;
  }

  function install() {
    installCssFallback();
    const panel = qs('[data-tab-panel="chat"]');
    const log0 = byId("coreChatLog");
    const input0 = byId("coreChatInput");
    const send0 = byId("coreSendBtn");

    if (!panel || !log0 || !input0 || !send0) return false;

    // Se a versão antiga do patch já criou shell quebrada, desfaz e reconstrói com os elementos atuais.
    if (panel.dataset.ncf7Ready === PATCH && panel.contains(log0) && panel.contains(input0) && panel.contains(send0)) {
      forceComposerStyles(input0, send0, byId("coreMicBtn"), qs(".noelle-chat-force-v7-composer", panel));
      decorateMessages(log0);
      scrollBottom(log0, true);
      return true;
    }

    const active = panel.classList.contains("active");
    const log = take("coreChatLog");
    const input = take("coreChatInput");
    const send = take("coreSendBtn");
    const mic = take("coreMicBtn");
    const statusLine = take("coreStatusLine") || take("coreChatStatus") || take("coreStatusBadge");
    const runtimeLine = take("coreRuntimeLine") || take("coreRuntimeStatus") || take("coreChatRuntime");

    const shell = make("div", "noelle-chat-force-v7-shell");

    const header = make("div", "noelle-chat-force-v7-header");
    const title = make("div", "noelle-chat-force-v7-title");
    title.append(make("strong", "", "Chat IA"), make("span", "", "Conversa limpa, input fixo e configurações recolhidas"));
    const status = make("div", "noelle-chat-force-v7-status");
    if (statusLine) status.appendChild(statusLine);
    if (runtimeLine) status.appendChild(runtimeLine);
    if (!status.children.length) status.textContent = statusText(statusLine, runtimeLine);
    header.append(title, status);

    const messages = make("section", "noelle-chat-force-v7-messages");
    log.classList.add("noelle-chat-force-v7-log");
    messages.appendChild(log);

    const composer = make("div", "noelle-chat-force-v7-composer" + (mic ? "" : " no-mic"));
    composer.append(input, send);
    if (mic) composer.appendChild(mic);
    forceComposerStyles(input, send, mic, composer);

    const settings = buildSettings();

    const hidden = make("div", "noelle-chat-force-v7-hidden-original");
    Array.from(panel.childNodes).forEach((node) => hidden.appendChild(node));

    shell.append(header, messages, composer, settings, hidden);
    panel.replaceChildren(shell);
    panel.classList.add("noelle-chat-force-v7-panel");
    panel.dataset.ncf7Ready = PATCH;
    if (active) panel.classList.add("active");

    important(panel, "height", "calc(100vh - 218px)");
    important(panel, "max-height", "calc(100vh - 218px)");
    important(panel, "overflow", "hidden");
    important(panel, "display", active ? "block" : "none");

    autogrow(input);
    decorateMessages(log);
    scrollBottom(log, true);

    if (!log.dataset.ncf7Observer) {
      log.dataset.ncf7Observer = "1";
      new MutationObserver(() => {
        decorateMessages(log);
        scrollBottom(log, false);
      }).observe(log, { childList: true, subtree: true });
    }

    document.querySelectorAll('[data-tab-target="chat"]').forEach((btn) => {
      if (btn.dataset.ncf7Click === "1") return;
      btn.dataset.ncf7Click = "1";
      btn.addEventListener("click", () => {
        setTimeout(() => {
          important(panel, "display", "block");
          decorateMessages(log);
          scrollBottom(log, true);
        }, 120);
      });
    });

    console.info(`[${PATCH}] janela do Chat IA reorganizada.`);
    return true;
  }

  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ok = install();
      if (ok && tries > 8) clearInterval(timer);
      if (tries >= 120) clearInterval(timer);
    }, 120);

    window.addEventListener("resize", () => setTimeout(install, 80));
    document.addEventListener("visibilitychange", () => setTimeout(install, 80));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 250), { once: true });
  } else {
    setTimeout(boot, 250);
  }
})();
