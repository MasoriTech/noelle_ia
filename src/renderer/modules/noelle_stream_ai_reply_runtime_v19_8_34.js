"use strict";
/*
  Noelle/Yoru Stream V19.8.34 — Guard to IA Existing Only
  - NÃO cria aba Stream nova.
  - NÃO mexe em Avatar/Loadfile/viewers.
  - Usa a Stream existente v19.8.29/v19.8.33.
  - Envia para IA local somente se a StreamGuard aprovar.
  - NÃO chama TTS.
*/
(() => {
  const VERSION = "19.8.34-guard-to-ia-existing-only-2026";

  const state = {
    autoReply: true,
    sending: false,
    lastText: "",
    lastKey: "",
    lastSentAt: 0,
    lastReply: "",
    lastError: "",
    ready: false
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function nowTime() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeText(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function streamRoot() {
    return qs("#streamPageV19829 .stream-v19829-shell") ||
      qs("#streamPageV19830c .stream-v19829-shell") ||
      qs('.page[data-page="stream"] .stream-v19829-shell') ||
      qs('.page[data-page="stream"]') ||
      qs("#streamPageV19829") ||
      null;
  }

  function setStatus(label, detail, kind = "thinking") {
    const pill = qs("#streamStatePill");
    const detailEl = qs("#streamStateDetail");

    if (pill) {
      pill.textContent = label;
      pill.dataset.state = kind;
    }

    if (detailEl) detailEl.textContent = detail;
    if (typeof window.streamSTTStatus === "function") window.streamSTTStatus(detail);
  }

  function addLog(kind, message) {
    const log = qs("#streamLog");
    if (!log) return;

    const empty = log.querySelector(".muted");
    if (empty) log.innerHTML = "";

    const item = document.createElement("div");
    item.className = "stream-v19829-log-item";
    item.innerHTML = `<strong>${escapeText(nowTime())} ${escapeText(kind)}</strong><br>${escapeText(message)}`;
    log.prepend(item);
  }

  function shouldRespond(rawText) {
    if (window.NoelleStreamFinalizeV19833?.shouldRespond) {
      try { return window.NoelleStreamFinalizeV19833.shouldRespond(rawText); } catch (_) {}
    }

    if (window.NoelleStreamPageV19829?.shouldRespond) {
      try { return window.NoelleStreamPageV19829.shouldRespond(rawText); } catch (_) {}
    }

    const t = normalize(rawText);
    const hasWakeWord = /\b(noelle|yoru)\b/i.test(t) || /\bei (noelle|yoru)\b/i.test(t);
    const looksQuestion = /\?/.test(rawText || "") || /\b(como|por que|porque|o que|qual|quando|onde|quem|pode|consegue|devo|faco|fazer|explica|me ajuda|ajuda)\b/i.test(t);

    if (!hasWakeWord) return { ok: false, reason: "bloqueado: não chamou Noelle/Yoru" };
    if (!looksQuestion) return { ok: false, reason: "bloqueado: não parece pergunta" };
    return { ok: true, reason: "aprovado: pergunta direcionada" };
  }

  function getCurrentTranscript() {
    const finalizeState = window.NoelleStreamFinalizeV19833?.getState?.();
    if (finalizeState?.lastTranscript) return String(finalizeState.lastTranscript).trim();

    const manual = qs("#streamManualTranscript");
    if (manual?.value) return String(manual.value).trim();

    const last = qs("#streamLastTranscript");
    const text = last?.textContent || "";
    if (/nenhuma fala/i.test(text)) return "";
    return String(text).trim();
  }

  function setAnswer(text, pending = false) {
    const answer = qs("#streamFutureAnswer");
    if (!answer) return;
    answer.textContent = text || (pending ? "Pensando..." : "");
  }

  function getChatApi() {
    const candidates = [
      window.noelleAPI?.chat,
      window.desktopWidget?.chat,
      window.desktopWidget?.noelleCoreChat,
      window.NoelleAPI?.chat,
      window.noelle?.chat
    ];

    return candidates.find((fn) => typeof fn === "function") || null;
  }

  function extractReply(result) {
    if (typeof result === "string") return result;
    if (!result || typeof result !== "object") return "";

    return result.response ||
      result.reply ||
      result.answer ||
      result.text ||
      result.message ||
      result.content ||
      result?.data?.response ||
      result?.data?.reply ||
      result?.data?.message ||
      result?.data?.text ||
      result?.result?.response ||
      result?.result?.text ||
      "";
  }

  async function callNoelleChat(text, decision) {
    const chat = getChatApi();

    if (!chat) {
      throw new Error("noelleAPI.chat não encontrado no preload");
    }

    const payload = {
      message: text,
      source: "stream-v19.8.34",
      stream: true,
      guard: decision,
      instruction: "Responda como Noelle. Esta fala veio da aba Stream e já passou pela StreamGuard. Seja objetiva. Não use TTS nesta fase."
    };

    const result = await chat(payload);
    const reply = extractReply(result);

    if (!reply) {
      if (result && result.ok === false) {
        throw new Error(result.error || result.message || "chat retornou erro sem texto");
      }
      throw new Error("chat retornou sem texto de resposta");
    }

    return { result, reply };
  }

  function ensurePanel() {
    if (qs("#streamAIReplyPanelV19834")) return;

    const root = streamRoot();
    if (!root) return;

    const card = document.createElement("section");
    card.id = "streamAIReplyPanelV19834";
    card.className = "stream-v19829-card";
    card.setAttribute("data-noelle-stream-ai-reply-v19-8-34", "true");
    card.innerHTML = `
      <h3>Resposta da IA</h3>
      <p class="muted" id="streamAIReplyDetailV19834">Aguardando transcrição aprovada pela StreamGuard.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
        <button id="streamSendToAIButtonV19834" type="button">Responder com IA</button>
        <button id="streamAutoAIButtonV19834" type="button">Auto IA: sim</button>
        <button id="streamCopyAIReplyButtonV19834" type="button">Copiar resposta</button>
        <button id="streamDebugAIButtonV19834" type="button">Debug IA</button>
      </div>
      <p class="muted" style="margin-top:8px;">Sem TTS nesta fase. A IA só responde se a frase chamar Noelle/Yoru e parecer pergunta.</p>
    `;

    const finalizePanel = qs("#streamFinalizePanelV19833", root);
    if (finalizePanel && finalizePanel.parentElement) finalizePanel.insertAdjacentElement("afterend", card);
    else root.appendChild(card);

    updatePanel();
  }

  function updatePanel() {
    const detail = qs("#streamAIReplyDetailV19834");
    const auto = qs("#streamAutoAIButtonV19834");
    const send = qs("#streamSendToAIButtonV19834");

    if (auto) auto.textContent = `Auto IA: ${state.autoReply ? "sim" : "não"}`;
    if (send) send.disabled = state.sending;

    if (!detail) return;

    if (state.sending) detail.textContent = "Enviando pergunta aprovada para a IA local...";
    else if (state.lastError) detail.textContent = "Último erro: " + state.lastError;
    else if (state.lastReply) detail.textContent = "Resposta recebida.";
    else detail.textContent = "Aguardando transcrição aprovada pela StreamGuard.";
  }

  function makeKey(text) {
    return normalize(text).slice(0, 240);
  }

  async function sendApprovedText(rawText, source = "manual") {
    ensurePanel();

    const text = String(rawText ?? "").trim();
    if (!text) {
      state.lastError = "sem texto para enviar";
      setStatus("Sem texto", "Nada para enviar para IA.", "blocked");
      updatePanel();
      return { ok: false, error: state.lastError };
    }

    const decision = shouldRespond(text);
    if (!decision.ok) {
      state.lastError = decision.reason;
      setStatus("Bloqueado", decision.reason, "blocked");
      setAnswer("Bloqueado pela StreamGuard. A IA não responderia.");
      addLog("ia", decision.reason + ": " + text);
      updatePanel();
      return { ok: false, blocked: true, reason: decision.reason };
    }

    const key = makeKey(text);
    const elapsed = Date.now() - state.lastSentAt;

    if (state.sending) {
      addLog("ia", "Envio ignorado: já existe uma resposta em andamento.");
      return { ok: false, error: "busy" };
    }

    if (key && key === state.lastKey && elapsed < 5000) {
      addLog("ia", "Envio duplicado ignorado por segurança.");
      return { ok: false, error: "duplicate" };
    }

    state.sending = true;
    state.lastText = text;
    state.lastError = "";
    state.lastKey = key;
    state.lastSentAt = Date.now();
    updatePanel();

    setStatus("IA pensando", "Pergunta aprovada. Enviando ao Ollama via noelleAPI.chat...", "thinking");
    setAnswer("Pensando...");
    addLog("ia", `Pergunta enviada (${source}): ${text}`);

    try {
      const { reply, result } = await callNoelleChat(text, decision);
      state.sending = false;
      state.lastReply = String(reply).trim();
      state.lastError = "";

      setStatus("Resposta pronta", "IA respondeu. TTS continua desligado nesta fase.", "ready_to_answer");
      setAnswer(state.lastReply);
      addLog("ia", "Resposta recebida da IA local.");
      updatePanel();

      window.dispatchEvent(new CustomEvent("noelle-stream-ai-reply-ready-v19834", {
        detail: { version: VERSION, text, reply: state.lastReply, result, decision }
      }));

      return { ok: true, text, reply: state.lastReply };
    } catch (err) {
      state.sending = false;
      state.lastError = err?.message || String(err);

      setStatus("Erro IA", state.lastError, "error");
      setAnswer("Erro ao chamar IA local: " + state.lastError);
      addLog("ia", "Erro: " + state.lastError);
      updatePanel();

      return { ok: false, error: state.lastError };
    }
  }

  async function sendCurrentTranscript() {
    return sendApprovedText(getCurrentTranscript(), "botao");
  }

  async function copyReply() {
    if (!state.lastReply) {
      addLog("ia", "Nenhuma resposta para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(state.lastReply);
      addLog("ia", "Resposta copiada.");
    } catch {
      addLog("ia", "Clipboard indisponível.");
    }
  }

  function debugAI() {
    console.table({
      aiReply: { ...state },
      chatApi: Boolean(getChatApi()),
      finalize: window.NoelleStreamFinalizeV19833?.getState?.(),
      page: window.NoelleStreamPageV19829?.getState?.()
    });
    addLog("debug", "Estado da IA Stream enviado ao console.");
  }

  function bind() {
    if (window.__NOELLE_STREAM_AI_REPLY_V19834_BOUND__) return;
    window.__NOELLE_STREAM_AI_REPLY_V19834_BOUND__ = true;

    window.addEventListener("noelle-stream-transcript-ready-v19833", (event) => {
      const detail = event.detail || {};
      const text = String(detail.text || "").trim();
      const decision = detail.decision || shouldRespond(text);

      state.lastText = text;
      ensurePanel();
      updatePanel();

      if (state.autoReply && text && decision.ok) {
        sendApprovedText(text, detail.source || "transcript-ready");
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "streamSendToAIButtonV19834") sendCurrentTranscript();
      if (target.id === "streamAutoAIButtonV19834") {
        state.autoReply = !state.autoReply;
        updatePanel();
        addLog("ia", "Auto IA: " + (state.autoReply ? "ligado" : "desligado"));
      }
      if (target.id === "streamCopyAIReplyButtonV19834") copyReply();
      if (target.id === "streamDebugAIButtonV19834") debugAI();
      if (target.id === "streamClearBtn") {
        state.lastText = "";
        state.lastReply = "";
        state.lastError = "";
        setTimeout(updatePanel, 80);
      }
      if (target.closest('[data-target="stream"]')) {
        setTimeout(() => { ensurePanel(); updatePanel(); }, 180);
      }
    }, true);

    ensurePanel();
    updatePanel();
    state.ready = true;
  }

  window.NoelleStreamAIReplyV19834 = Object.freeze({
    version: VERSION,
    bind,
    ensurePanel,
    sendApprovedText,
    sendCurrentTranscript,
    shouldRespond,
    getState: () => ({ ...state })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
