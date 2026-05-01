"use strict";
// NOELLE_V19_8_32_STREAM_SEGMENT_RECORDER
/*
 Noelle/Yoru V19.8.33 — Stream Page Recovery
 - mantém a aba Stream IA;
 - microfone só liga por botão;
 - NÃO chama STT/Ollama/TTS;
 - regra: só responder quando for pergunta direcionada a Noelle/Yoru.
*/
(() => {
  const VERSION = "19.8.33-stream-page-recovery-2026";
  const state = {
    status: "idle",
    mode: "wake_question",
    muted: false,
    lastTranscript: "",
    lastDecision: "Aguardando fala.",
    logs: []
  };

  const STATUS_LABELS = {
    idle: "Parado",
    listening: "Microfone ligado",
    waiting_trigger: "Aguardando pergunta direcionada",
    blocked: "Bloqueado pela StreamGuard",
    ready_to_answer: "Pergunta aprovada",
    thinking: "IA futura",
    speaking: "Voz futura",
    error: "Erro"
  };

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function text(value) { return String(value ?? ""); }
  function now() { return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  function escapeText(value) {
    const div = document.createElement("div");
    div.textContent = text(value);
    return div.innerHTML;
  }

  function normalizeTranscript(value) {
    return text(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function shouldRespond(rawText) {
    const t = normalizeTranscript(rawText);
    const hasWakeWord = /\b(noelle|yoru)\b/i.test(t) || /\bei (noelle|yoru)\b/i.test(t);
    const looksQuestion = /\?/.test(rawText || "") || /\b(como|por que|porque|o que|qual|quando|onde|quem|pode|consegue|devo|faco|fazer|explica|me ajuda|ajuda)\b/i.test(t);
    if (!hasWakeWord) return { ok: false, reason: "bloqueado: não chamou Noelle/Yoru" };
    if (!looksQuestion) return { ok: false, reason: "bloqueado: não parece pergunta" };
    return { ok: true, reason: "aprovado: pergunta direcionada" };
  }

  function setStatus(status, detail = "") {
    state.status = status;
    state.lastDecision = detail || STATUS_LABELS[status] || status;
    const pill = qs("#streamStatePill");
    const detailEl = qs("#streamStateDetail");
    if (pill) {
      pill.textContent = STATUS_LABELS[status] || status;
      pill.dataset.state = status;
    }
    if (detailEl) detailEl.textContent = state.lastDecision;
    render();
  }

  function addLog(kind, message) {
    state.logs.unshift({ at: now(), kind, message });
    state.logs = state.logs.slice(0, 40);
    renderLog();
  }

  function findNavParent() {
    const existing = qs('[data-target="stream"]');
    if (existing?.parentElement) return existing.parentElement;
    const known = qs('[data-target="avatar"]') || qs('[data-target="chat"]') || qs('[data-target="settings"]') || qs('[data-target="about"]');
    if (known?.parentElement) return known.parentElement;
    return qs(".side-nav") || qs(".nav") || qs("nav") || null;
  }

  function ensureNav() {
    let btn = qs('[data-target="stream"]');
    if (btn) return btn;
    const parent = findNavParent();
    if (!parent) return null;
    const ref = qs('[data-target="about"]') || qs('[data-target="settings"]') || qs('[data-target="chat"]') || qs('[data-target]');
    btn = document.createElement(ref?.tagName?.toLowerCase() === "a" ? "a" : "button");
    btn.className = ref?.className || "nav-item";
    if (btn.tagName.toLowerCase() === "button") btn.type = "button";
    else btn.href = "#stream";
    btn.dataset.target = "stream";
    btn.setAttribute("data-noelle-stream-tab", VERSION);
    btn.textContent = "◌ Stream";
    const about = parent.querySelector('[data-target="about"]');
    if (about) parent.insertBefore(btn, about);
    else parent.appendChild(btn);
    return btn;
  }

  function streamPageHtml() {
    return `
      <div class="stream-v19829-shell">
        <header class="stream-v19829-header">
          <div>
            <p class="eyebrow">Stream IA · V19.8.33</p>
            <h2>Escuta em tempo real controlada</h2>
            <p class="muted">Microfone por botão. A Noelle/Yoru só deve responder quando for pergunta direcionada a ela.</p>
          </div>
          <div class="stream-v19829-state">
            <span id="streamStatePill" class="stream-v19829-pill" data-state="idle">Parado</span>
            <small id="streamStateDetail">Microfone desligado. Aperte Iniciar escuta.</small>
          </div>
        </header>

        <section class="stream-v19829-card">
          <h3>Controle</h3>
          <div class="stream-v19829-actions">
            <button id="streamStartBtn" type="button">Iniciar escuta</button>
            <button id="streamStopBtn" type="button">Parar escuta</button>
            <button id="streamMuteBtn" type="button">Mute voz: não</button>
            <button id="streamClearBtn" type="button">Limpar</button>
          </div>
          <label class="stream-v19829-field">
            <span>Modo inicial</span>
            <select id="streamModeSelect">
              <option value="wake_question">Wake word + pergunta</option>
              <option value="manual">Manual</option>
              <option value="transcribe_only">Só transcrever</option>
            </select>
          </label>
          <div class="stream-v19829-meter" aria-label="Volume do microfone">
            <div id="streamFakeMeterBar" class="stream-v19829-meter-bar"></div>
          </div>
          <p class="muted">Fase atual: medidor, VAD e gravação de trecho em memória. STT/Ollama/TTS ficam para próximas fases.</p>
        </section>

        <section class="stream-v19829-card">
          <h3>Teste da StreamGuard</h3>
          <p class="muted">Digite uma fala simulada para testar a regra: só responder se for pergunta direcionada a Noelle/Yoru.</p>
          <textarea id="streamManualTranscript" rows="3" placeholder="Ex.: Noelle, qual é o próximo passo?"></textarea>
          <div class="stream-v19829-actions">
            <button id="streamCheckGuardBtn" type="button">Testar regra</button>
            <button id="streamUseExampleBtn" type="button">Exemplo</button>
          </div>
        </section>

        <section class="stream-v19829-grid">
          <div class="stream-v19829-card">
            <h3>Você disse</h3>
            <p id="streamLastTranscript">Nenhuma fala ainda.</p>
          </div>
          <div class="stream-v19829-card">
            <h3>Resposta futura</h3>
            <p id="streamFutureAnswer" class="muted">A IA ainda não responde nesta fase. Aqui entrará Ollama streaming depois.</p>
          </div>
        </section>

        <section class="stream-v19829-card">
          <h3>Log da Stream</h3>
          <div id="streamLog"><p class="muted">Nenhum evento ainda.</p></div>
        </section>
      </div>`;
  }

  function findPagesRoot() {
    const known = qs('.page[data-page="stream"]') || qs('.page[data-page="avatar"]') || qs('.page[data-page="chat"]') || qs('.page[data-page="settings"]') || qs('.page[data-page="about"]');
    if (known?.parentElement) return known.parentElement;
    return qs("main") || qs(".content") || document.body;
  }

  function ensurePage() {
    let page = qs('.page[data-page="stream"]');
    if (page) {
      if (!qs("#streamStatePill", page) || !qs("#streamStartBtn", page)) page.innerHTML = streamPageHtml();
      return page;
    }
    const root = findPagesRoot();
    page = document.createElement("section");
    page.className = "page";
    page.dataset.page = "stream";
    page.id = "streamPageV19829";
    page.innerHTML = streamPageHtml();
    const about = root.querySelector('.page[data-page="about"]');
    if (about) root.insertBefore(page, about);
    else root.appendChild(page);
    return page;
  }

  function showStreamPage() {
    ensure();
    qsa(".page").forEach((page) => {
      const active = page.dataset.page === "stream";
      page.classList.toggle("active", active);
      page.classList.toggle("is-active", active);
      page.hidden = !active;
      page.style.display = active ? "" : "none";
    });
    qsa("[data-target]").forEach((btn) => {
      const active = btn.dataset.target === "stream";
      btn.classList.toggle("active", active);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function bindOnce() {
    if (window.__NOELLE_STREAM_V19833_BOUND__) return;
    window.__NOELLE_STREAM_V19833_BOUND__ = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const nav = target?.closest?.('[data-target="stream"]');
      if (nav) {
        event.preventDefault();
        showStreamPage();
        return;
      }
      if (!target) return;
      if (target.id === "streamStartBtn") {
        setStatus("listening", "Microfone ligado pelo botão. Somente medidor/VAD/trecho local.");
        addLog("status", "Escuta iniciada por botão.");
        pulseMeter(true);
      } else if (target.id === "streamStopBtn") {
        setStatus("idle", "Escuta parada.");
        addLog("status", "Escuta parada.");
        pulseMeter(false);
      } else if (target.id === "streamMuteBtn") {
        state.muted = !state.muted;
        target.textContent = `Mute voz: ${state.muted ? "sim" : "não"}`;
        addLog("voz", state.muted ? "Voz futura silenciada." : "Voz futura ativada.");
      } else if (target.id === "streamClearBtn") {
        state.lastTranscript = "";
        state.logs = [];
        state.lastDecision = "Aguardando fala.";
        const input = qs("#streamManualTranscript");
        if (input) input.value = "";
        const answer = qs("#streamFutureAnswer");
        if (answer) answer.textContent = "A IA ainda não responde nesta fase. Aqui entrará Ollama streaming depois.";
        setStatus("idle", "Stream limpa.");
        render();
      } else if (target.id === "streamUseExampleBtn") {
        const input = qs("#streamManualTranscript");
        if (input) input.value = "Noelle, qual é o próximo passo?";
      } else if (target.id === "streamCheckGuardBtn") {
        const input = qs("#streamManualTranscript");
        const value = input?.value || "";
        state.lastTranscript = value;
        const decision = shouldRespond(value);
        const answer = qs("#streamFutureAnswer");
        if (decision.ok) {
          setStatus("ready_to_answer", decision.reason);
          if (answer) answer.textContent = "Pergunta aprovada. Na fase futura, isto será enviado ao Ollama.";
          addLog("guard", `Aprovado: ${value}`);
        } else {
          setStatus("blocked", decision.reason);
          if (answer) answer.textContent = "Bloqueado. A IA não responderia.";
          addLog("guard", `${decision.reason}: ${value || "(vazio)"}`);
        }
        render();
      }
    }, true);

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement && target.id === "streamModeSelect") {
        state.mode = target.value;
        addLog("modo", `Modo alterado para: ${target.value}`);
      }
    });
  }

  function pulseMeter(active) {
    const bar = qs("#streamFakeMeterBar");
    if (!bar) return;
    bar.classList.toggle("is-active", !!active);
    if (!active) bar.style.width = "0%";
  }

  function renderLog() {
    const log = qs("#streamLog");
    if (!log) return;
    if (!state.logs.length) {
      log.innerHTML = '<p class="muted">Nenhum evento ainda.</p>';
      return;
    }
    log.innerHTML = state.logs.map((item) => `
      <div class="stream-v19829-log-item">
        <strong>${escapeText(item.at)} ${escapeText(item.kind)}</strong>
        <span>${escapeText(item.message)}</span>
      </div>`).join("");
  }

  function render() {
    const transcript = qs("#streamLastTranscript");
    if (transcript) transcript.textContent = state.lastTranscript || "Nenhuma fala ainda.";
    const mode = qs("#streamModeSelect");
    if (mode && mode.value !== state.mode) mode.value = state.mode;
    const pill = qs("#streamStatePill");
    if (pill) {
      pill.textContent = STATUS_LABELS[state.status] || state.status;
      pill.dataset.state = state.status;
    }
    const detail = qs("#streamStateDetail");
    if (detail) detail.textContent = state.lastDecision || "Aguardando fala.";
    renderLog();
  }

  function ensure() {
    ensureNav();
    ensurePage();
    bindOnce();
    render();
  }

  function boot() {
    ensure();
    setTimeout(ensure, 80);
    setTimeout(ensure, 300);
  }

  window.NoelleStreamPageV19829 = Object.freeze({ version: VERSION, ensure, render, showStreamPage, shouldRespond, getState: () => ({ ...state }) });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
