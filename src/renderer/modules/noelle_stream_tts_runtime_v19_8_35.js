(() => {
  "use strict";

  /*
    Noelle Stream V19.8.35 — TTS Reply Runtime

    Objetivo:
    - Finalizar a fase de voz da aba Stream sem recriar a Stream.
    - Usar a ponte existente window.noelleAPI.speak(text).
    - Não tocar em Avatar/Loadfile/viewers 3D.
    - Auto voz fica DESLIGADO por padrão.
    - Só fala quando houver resposta de IA válida ou clique manual.
  */

  const VERSION = "19.8.35-tts-existing-only-2026";

  const state = {
    installed: false,
    speaking: false,
    autoVoice: false,
    lastSpokenHash: "",
    lastAnswer: "",
    observer: null,
    retryTimer: null
  };

  const BAD_ANSWER_PATTERNS = [
    /a ia ainda não responde/i,
    /ia ainda não responde/i,
    /aqui entrará ollama/i,
    /pergunta aprovada/i,
    /bloqueado/i,
    /não responderia/i,
    /nenhuma fala/i,
    /aguardando/i
  ];

  function log(...args) {
    console.log("[stream-tts-v19.8.35]", ...args);
  }

  function warn(...args) {
    console.warn("[stream-tts-v19.8.35]", ...args);
  }

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function text(value) {
    return String(value ?? "");
  }

  function normalize(value) {
    return text(value).replace(/\s+/g, " ").trim();
  }

  function hashText(value) {
    const input = normalize(value);
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return String(hash);
  }

  function getStreamPage() {
    return $('.page[data-page="stream"]') || $("#streamPageV19829") || document;
  }

  function getAnswerElement() {
    return (
      $("#streamAIReplyText") ||
      $("#streamAIReply") ||
      $("#streamFutureAnswer") ||
      $('[data-stream-ai-answer="true"]') ||
      $('[data-noelle-stream-answer="true"]')
    );
  }

  function getTranscriptText() {
    const candidates = [
      $("#streamLastTranscript"),
      $("#streamManualTranscript"),
      $("#streamTranscriptText"),
      $('[data-stream-transcript="true"]')
    ];

    for (const el of candidates) {
      if (!el) continue;
      const value = "value" in el ? el.value : el.textContent;
      const cleaned = normalize(value);
      if (cleaned) return cleaned;
    }

    return "";
  }

  function getAnswerText() {
    const answer = getAnswerElement();
    if (!answer) return "";
    return normalize(answer.textContent || answer.value || "");
  }

  function isMuted() {
    try {
      const streamApi = window.NoelleStreamPageV19829;
      if (streamApi && typeof streamApi.getState === "function") {
        const s = streamApi.getState();
        if (s && s.muted) return true;
      }
    } catch {}

    const muteBtn = $("#streamMuteBtn");
    const label = normalize(muteBtn?.textContent || "");
    return /mute voz:\s*sim/i.test(label) || /voz:\s*sim/i.test(label);
  }

  function isLikelyValidAnswer(value) {
    const answer = normalize(value);
    if (answer.length < 2) return false;
    if (answer.length > 4000) return false;
    return !BAD_ANSWER_PATTERNS.some((pattern) => pattern.test(answer));
  }

  function guardAllowsSpeech() {
    const transcript = getTranscriptText();

    try {
      const streamApi = window.NoelleStreamPageV19829;
      if (streamApi && typeof streamApi.shouldRespond === "function") {
        const decision = streamApi.shouldRespond(transcript);
        if (decision && decision.ok) return true;
      }
    } catch {}

    // Se não houver transcript mas já há resposta real da IA, permite fala manual.
    return Boolean(getAnswerText() && isLikelyValidAnswer(getAnswerText()));
  }

  function setStatus(message, kind = "info") {
    const el = $("#streamTTSStatusV19835");
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }

  function addLog(message) {
    try {
      const streamApi = window.NoelleStreamPageV19829;
      if (streamApi && typeof streamApi.getState === "function") {
        // A API pública atual não expõe addLog, então usamos só status local.
      }
    } catch {}

    log(message);
  }

  function getNoelleSpeak() {
    const api = window.noelleAPI;
    if (api && typeof api.speak === "function") return api.speak.bind(api);
    return null;
  }

  async function speakText(rawText, options = {}) {
    const answer = normalize(rawText);
    const manual = Boolean(options.manual);

    if (!isLikelyValidAnswer(answer)) {
      setStatus("Nada válido para falar.", "warn");
      return { ok: false, reason: "invalid_answer" };
    }

    if (isMuted()) {
      setStatus("Voz está em mute.", "warn");
      return { ok: false, reason: "muted" };
    }

    if (!manual && !guardAllowsSpeech()) {
      setStatus("StreamGuard não liberou voz automática.", "warn");
      return { ok: false, reason: "guard_blocked" };
    }

    const answerHash = hashText(answer);
    if (!manual && answerHash === state.lastSpokenHash) {
      setStatus("Resposta já falada.", "info");
      return { ok: false, reason: "duplicate" };
    }

    const speak = getNoelleSpeak();
    if (!speak) {
      setStatus("Ponte TTS indisponível: noelleAPI.speak não existe.", "error");
      return { ok: false, reason: "missing_api" };
    }

    try {
      state.speaking = true;
      state.lastSpokenHash = answerHash;
      setStatus("Falando resposta...", "ok");

      const result = await speak(answer);

      setStatus("Voz enviada ao TTS.", "ok");
      state.speaking = false;
      return { ok: true, result };
    } catch (err) {
      state.speaking = false;
      state.lastSpokenHash = "";
      setStatus("Falha no TTS: " + (err?.message || err), "error");
      warn("TTS falhou", err);
      return { ok: false, reason: "speak_failed", error: err };
    }
  }

  function ensurePanel() {
    const page = getStreamPage();
    if (!page || $("#streamTTSPanelV19835")) return;

    const anchor =
      $("#streamAIReplyPanel") ||
      $("#streamFutureAnswer")?.closest?.("section, .card, div") ||
      $("#streamFutureAnswer")?.parentElement ||
      $("#streamLog")?.closest?.("section, .card, div") ||
      $("#streamLog")?.parentElement ||
      page;

    const panel = document.createElement("section");
    panel.id = "streamTTSPanelV19835";
    panel.setAttribute("data-noelle-stream-tts", VERSION);
    panel.style.marginTop = "14px";
    panel.style.padding = "14px";
    panel.style.border = "1px solid rgba(255,255,255,.10)";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(255,255,255,.035)";

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <strong style="display:block;font-size:15px;">Voz da Stream</strong>
          <span id="streamTTSStatusV19835" data-kind="info" style="font-size:12px;opacity:.72;">Auto voz desligado.</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="streamSpeakReplyBtnV19835" type="button">Falar resposta</button>
          <button id="streamAutoVoiceBtnV19835" type="button">Auto voz: não</button>
          <button id="streamForgetVoiceBtnV19835" type="button">Reset voz</button>
        </div>
      </div>
      <p style="margin:10px 0 0;font-size:12px;opacity:.66;">
        Usa noelleAPI.speak. Auto voz só fala resposta válida e aprovada pela StreamGuard.
      </p>
    `;

    if (anchor === page) {
      page.appendChild(panel);
    } else {
      anchor.insertAdjacentElement("afterend", panel);
    }
  }

  function updateAutoVoiceButton() {
    const btn = $("#streamAutoVoiceBtnV19835");
    if (btn) btn.textContent = "Auto voz: " + (state.autoVoice ? "sim" : "não");
    setStatus(state.autoVoice ? "Auto voz ligado." : "Auto voz desligado.", "info");
  }

  function bindControls() {
    if (document.__streamTTSV19835Bound) return;
    document.__streamTTSV19835Bound = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      if (target.id === "streamSpeakReplyBtnV19835") {
        speakText(getAnswerText(), { manual: true });
      }

      if (target.id === "streamAutoVoiceBtnV19835") {
        state.autoVoice = !state.autoVoice;
        updateAutoVoiceButton();

        if (state.autoVoice) {
          const current = getAnswerText();
          if (isLikelyValidAnswer(current)) speakText(current, { manual: false });
        }
      }

      if (target.id === "streamForgetVoiceBtnV19835") {
        state.lastSpokenHash = "";
        setStatus("Memória de voz resetada.", "info");
      }
    }, true);
  }

  function watchAnswer() {
    if (state.observer) return;

    const answer = getAnswerElement();
    if (!answer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = setTimeout(watchAnswer, 700);
      return;
    }

    state.observer = new MutationObserver(() => {
      const value = getAnswerText();
      state.lastAnswer = value;

      if (state.autoVoice && isLikelyValidAnswer(value)) {
        clearTimeout(state.retryTimer);
        state.retryTimer = setTimeout(() => speakText(value, { manual: false }), 350);
      }
    });

    state.observer.observe(answer, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function bindEvents() {
    window.addEventListener("noelle:stream-ai-reply", (event) => {
      const value = normalize(event?.detail?.answer || event?.detail?.text || "");
      if (!value) return;

      state.lastAnswer = value;
      if (state.autoVoice) speakText(value, { manual: false });
    });

    window.addEventListener("noelle:stream-ai-reply-ready", (event) => {
      const value = normalize(event?.detail?.answer || event?.detail?.text || getAnswerText());
      if (!value) return;

      state.lastAnswer = value;
      if (state.autoVoice) speakText(value, { manual: false });
    });
  }

  function ensure() {
    ensurePanel();
    bindControls();
    bindEvents();
    watchAnswer();
    updateAutoVoiceButton();
  }

  function boot() {
    if (state.installed) return;
    state.installed = true;

    ensure();
    setTimeout(ensure, 250);
    setTimeout(ensure, 800);
    setTimeout(ensure, 1500);

    window.NoelleStreamTTSV19835 = Object.freeze({
      version: VERSION,
      ensure,
      speakReply: () => speakText(getAnswerText(), { manual: true }),
      speakText: (value) => speakText(value, { manual: true }),
      getState: () => ({ ...state })
    });

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
