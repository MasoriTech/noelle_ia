// Noelle Chat IA V8 - reorganiza a aba sem quebrar os listeners existentes.
(function () {
  const MARK = "noelleChatV8Modern";

  function byId(id) { return document.getElementById(id); }

  function text(el, fallback) {
    const value = String(el?.textContent || "").trim();
    return value || fallback;
  }

  function setImportant(el, prop, value) {
    if (!el) return;
    try { el.style.setProperty(prop, value, "important"); } catch (_) {}
  }

  function findChatPanel(log, input) {
    return document.querySelector('[data-tab-panel="chat"]')
      || log?.closest('[data-tab-panel]')
      || input?.closest('[data-tab-panel]')
      || log?.closest('section, main, .panel, .tab-panel, .card')
      || input?.closest('section, main, .panel, .tab-panel, .card');
  }

  function isInside(node, roots) {
    return roots.some((root) => root && (node === root || node.contains(root)));
  }

  function moveIf(el, parent) {
    if (el && parent && el.parentElement !== parent) parent.appendChild(el);
  }

  function normalizeSendButton(btn) {
    if (!btn) return;
    btn.classList.add("noelle-v8-send");
    btn.title = "Enviar mensagem";
    btn.setAttribute("aria-label", "Enviar mensagem");
    if (!btn.dataset.noelleV8OriginalText) btn.dataset.noelleV8OriginalText = text(btn, "Enviar");
  }

  function normalizeMicButton(btn) {
    if (!btn) return;
    btn.classList.add("noelle-v8-mic");
    btn.title = btn.title || "Falar para preencher o texto";
    btn.setAttribute("aria-label", btn.getAttribute("aria-label") || "Falar para preencher o texto");
  }

  function autoGrowInput(input, log) {
    if (!input || input.dataset.noelleV8AutoGrow) return;
    input.dataset.noelleV8AutoGrow = "1";
    const resize = () => {
      input.style.height = "46px";
      const next = Math.min(116, Math.max(46, input.scrollHeight || 46));
      input.style.height = next + "px";
      if (log) requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    };
    input.addEventListener("input", resize);
    input.addEventListener("focus", resize);
    setTimeout(resize, 120);
  }

  function forceDimensions(panel, shell, log, input, send, mic) {
    if (panel) {
      panel.classList.add("noelle-chat-v8-panel");
      setImportant(panel, "overflow", "hidden");
      setImportant(panel, "min-height", "500px");
    }
    if (shell) {
      setImportant(shell, "display", "grid");
      setImportant(shell, "grid-template-rows", "auto minmax(0, 1fr) auto auto");
      setImportant(shell, "overflow", "hidden");
      setImportant(shell, "min-height", "0");
    }
    if (log) {
      log.classList.add("noelle-v8-log");
      setImportant(log, "overflow-y", "auto");
      setImportant(log, "height", "100%");
      setImportant(log, "max-height", "none");
      setImportant(log, "min-height", "0");
    }
    if (input) input.classList.add("noelle-v8-input");
    normalizeSendButton(send);
    normalizeMicButton(mic);
  }

  function rebuildChat() {
    const log = byId("coreChatLog");
    const input = byId("coreChatInput");
    const send = byId("coreSendBtn");
    const mic = byId("coreMicBtn");
    const status = byId("coreStatusLine");
    const runtime = byId("coreRuntimeLine");
    if (!log || !input || !send) return false;

    const panel = findChatPanel(log, input);
    if (!panel) return false;

    let shell = panel.querySelector(":scope > .noelle-chat-v8-shell");
    if (!shell) {
      const oldChildren = Array.from(panel.children);

      shell = document.createElement("div");
      shell.className = "noelle-chat-v8-shell";
      shell.dataset[MARK] = "1";

      const header = document.createElement("div");
      header.className = "noelle-chat-v8-header";

      const title = document.createElement("div");
      title.className = "noelle-chat-v8-title";
      title.innerHTML = "<strong>♛ Chat IA</strong><span>Conversa local com NoelleCore</span>";

      const statusBox = document.createElement("div");
      statusBox.className = "noelle-chat-v8-statusbox";

      const messages = document.createElement("div");
      messages.className = "noelle-chat-v8-messages";

      const composer = document.createElement("div");
      composer.className = "noelle-chat-v8-composer";

      const settings = document.createElement("details");
      settings.className = "noelle-chat-v8-settings";
      const summary = document.createElement("summary");
      summary.textContent = "Configurações do Chat IA";
      const settingsBody = document.createElement("div");
      settingsBody.className = "noelle-chat-v8-settings-body";
      settings.append(summary, settingsBody);

      header.append(title, statusBox);
      if (status) {
        status.classList.add("noelle-v8-status");
        statusBox.appendChild(status);
      }
      if (runtime) {
        runtime.classList.add("noelle-v8-runtime");
        title.appendChild(runtime);
      }

      messages.appendChild(log);
      composer.appendChild(input);
      composer.appendChild(send);
      if (mic) composer.appendChild(mic);

      shell.append(header, messages, composer, settings);
      panel.appendChild(shell);

      const protectedRoots = [shell, log, input, send, mic, status, runtime];
      oldChildren.forEach((child) => {
        if (!child || child === shell || isInside(child, protectedRoots)) return;
        if (String(child.textContent || "").trim() || child.querySelector("button,input,select,textarea,details")) {
          settingsBody.appendChild(child);
        }
      });
    } else {
      const messages = shell.querySelector(".noelle-chat-v8-messages");
      const composer = shell.querySelector(".noelle-chat-v8-composer");
      const statusBox = shell.querySelector(".noelle-chat-v8-statusbox");
      const title = shell.querySelector(".noelle-chat-v8-title");
      moveIf(log, messages);
      moveIf(input, composer);
      moveIf(send, composer);
      moveIf(mic, composer);
      moveIf(status, statusBox);
      moveIf(runtime, title);
    }

    panel.dataset.noelleChatV8 = "1";
    forceDimensions(panel, shell, log, input, send, mic);
    autoGrowInput(input, log);
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    return true;
  }

  function install() {
    rebuildChat();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (rebuildChat() || tries > 40) clearInterval(timer);
    }, 250);

    const observer = new MutationObserver(() => {
      if (observer._busy) return;
      observer._busy = true;
      requestAnimationFrame(() => {
        try { rebuildChat(); } finally { observer._busy = false; }
      });
    });
    try { observer.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}

    window.addEventListener("resize", () => setTimeout(rebuildChat, 80));
    document.addEventListener("click", (event) => {
      const tab = event.target?.closest?.('[data-tab-target="chat"]');
      if (tab) setTimeout(rebuildChat, 80);
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
