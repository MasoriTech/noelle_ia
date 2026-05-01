"use strict";
// NOELLE_V19_8_31_STREAM_VAD_SIMPLE
// NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP
// NOELLE_V19_8_30C_STREAM_TAB_RECOVER_READY

/*
  Noelle/Yoru V19.8.29 — Stream Tab Skeleton
  Fase 1:
  - cria aba Stream IA;
  - cria layout, estados e botões;
  - NÃO liga microfone;
  - NÃO chama STT;
  - NÃO chama Ollama;
  - NÃO chama TTS.
*/

(() => {
  const VERSION = "19.8.29-stream-tab-skeleton-2026";

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

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function text(value) {
    return String(value ?? "");
  }

  function escapeText(value) {
    const div = document.createElement("div");
    div.textContent = text(value);
    return div.innerHTML;
  }

  function now() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function setStatus(status, detail = "") {
    state.status = status;
    state.lastDecision = detail || STATUS_LABELS[status] || status;

    const pill = $("#streamStatePill");
    const detailEl = $("#streamStateDetail");

    if (pill) {
      pill.textContent = STATUS_LABELS[status] || status;
      pill.dataset.state = status;
    }

    if (detailEl) detailEl.textContent = state.lastDecision;

    render();
  }

  function addLog(kind, message) {
    state.logs.unshift({
      at: now(),
      kind,
      message
    });
    state.logs = state.logs.slice(0, 30);
    renderLog();
  }

  function normalizeTranscript(value) {
    return text(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function shouldRespond(rawText) {
    const t = normalizeTranscript(rawText);

    const hasWakeWord =
      /\bnoelle\b/i.test(t) ||
      /\byoru\b/i.test(t) ||
      /\bei noelle\b/i.test(t) ||
      /\bei yoru\b/i.test(t);

    const looksQuestion =
      /\?/.test(rawText || "") ||
      /\b(como|por que|porque|o que|qual|quando|onde|quem|pode|consegue|devo|faco|fazer|explica|me ajuda)\b/i.test(t);

    if (!hasWakeWord) {
      return {
        ok: false,
        reason: "bloqueado: não chamou Noelle/Yoru"
      };
    }

    if (!looksQuestion) {
      return {
        ok: false,
        reason: "bloqueado: não parece pergunta"
      };
    }

    return {
      ok: true,
      reason: "aprovado: pergunta direcionada"
    };
  }

  function ensureNav() {
    if (document.querySelector('[data-target="stream"]')) return;

    const navParent =
      document.querySelector('[data-target="about"]')?.parentElement ||
      document.querySelector('[data-target="settings"]')?.parentElement ||
      document.querySelector(".side-nav") ||
      document.querySelector(".nav") ||
      document.querySelector("nav");

    if (!navParent) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-item";
    btn.dataset.target = "stream";
    btn.innerHTML = '<span>◌</span><span>Stream</span>';

    const about = navParent.querySelector('[data-target="about"]');
    if (about) navParent.insertBefore(btn, about);
    else navParent.appendChild(btn);
  }

  function streamPageHtml() {
    return `
      <div class="stream-v19829-shell">
        <section class="stream-v19829-hero">
          <div>
            <p class="eyebrow">Stream IA · Fase 2</p>
            <h2>Escuta em tempo real controlada</h2>
            <p class="muted">
              Microfone por botão ativo. A escuta só começa quando você aperta Iniciar escuta.
              A regra oficial já fica pronta: só responder pergunta direcionada a Noelle/Yoru.
            </p>
          </div>
          <div class="stream-v19829-state-card">
            <span id="streamStatePill" class="stream-v19829-pill" data-state="idle">Parado</span>
            <small id="streamStateDetail">Microfone desligado. Aperte Iniciar escuta para ativar o medidor real.</small>
          </div>
        </section>

        <section class="stream-v19829-grid">
          <article class="stream-v19829-card">
            <h3>Controle</h3>
            <div class="stream-v19829-actions">
              <button id="streamStartBtn" type="button" class="primary">Iniciar escuta</button>
              <button id="streamStopBtn" type="button">Parar escuta</button>
              <button id="streamMuteBtn" type="button">Mute voz: não</button>
              <button id="streamClearBtn" type="button">Limpar</button>
            </div>

            <label class="stream-v19829-label" for="streamModeSelect">Modo inicial</label>
            <select id="streamModeSelect" class="stream-v19829-select">
              <option value="wake_question">Wake word + pergunta</option>
              <option value="manual">Manual</option>
              <option value="disabled">Só transcrever</option>
            </select>

            <div class="stream-v19829-meter" aria-label="Medidor visual de microfone">
              <div id="streamFakeMeterBar"></div>
            </div>

            <p class="stream-v19829-note">
              Fase 3: VAD simples ativo. A aba detecta fala e silêncio; transcrição, resposta da IA e voz entram em fases futuras.
            </p>
          </article>

          <article class="stream-v19829-card">
            <h3>Teste da StreamGuard</h3>
            <p class="muted">
              Digite uma fala simulada para testar a regra: só responde se for pergunta direcionada a Noelle/Yoru.
            </p>
            <textarea id="streamManualTranscript" class="stream-v19829-textarea" rows="4" placeholder="Ex.: Noelle, qual é o próximo passo?"></textarea>
            <div class="stream-v19829-actions">
              <button id="streamCheckGuardBtn" type="button" class="primary">Testar regra</button>
              <button id="streamUseExampleBtn" type="button">Exemplo</button>
            </div>
          </article>
        </section>

        <section class="stream-v19829-grid">
          <article class="stream-v19829-card">
            <h3>Você disse</h3>
            <div id="streamLastTranscript" class="stream-v19829-box">Nenhuma fala ainda.</div>
          </article>

          <article class="stream-v19829-card">
            <h3>Resposta futura</h3>
            <div id="streamFutureAnswer" class="stream-v19829-box">
              A IA ainda não responde nesta fase. Aqui vai entrar Ollama streaming depois.
            </div>
          </article>
        </section>

        <section class="stream-v19829-card">
          <h3>Log da Stream</h3>
          <div id="streamLog" class="stream-v19829-log"></div>
        </section>
      </div>
    `;
  }

  function ensurePage() {
    if (document.querySelector('.page[data-page="stream"]')) return;

    const pagesRoot =
      document.querySelector('.page[data-page="about"]')?.parentElement ||
      document.querySelector('.page[data-page="settings"]')?.parentElement ||
      document.querySelector("main") ||
      document.body;

    const page = document.createElement("section");
    page.className = "page";
    page.dataset.page = "stream";
    page.id = "streamPageV19829";
    page.innerHTML = streamPageHtml();

    const about = pagesRoot.querySelector('.page[data-page="about"]');
    if (about) pagesRoot.insertBefore(page, about);
    else pagesRoot.appendChild(page);
  }

  function bindOnce() {
    if (window.__NOELLE_STREAM_V19829_BOUND__) return;
    window.__NOELLE_STREAM_V19829_BOUND__ = true;

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      if (target.id === "streamStartBtn") {
        setStatus("listening", "Microfone ligado. Microfone real entra na próxima fase.");
        addLog("status", "Escuta iniciada por botão. Somente medidor de volume ativo.");
        pulseMeter(true);
      }

      if (target.id === "streamStopBtn") {
        setStatus("idle", "Escuta parada.");
        addLog("status", "Escuta parada.");
        pulseMeter(false);
      }

      if (target.id === "streamMuteBtn") {
        state.muted = !state.muted;
        target.textContent = `Mute voz: ${state.muted ? "sim" : "não"}`;
        addLog("voz", state.muted ? "Voz futura silenciada." : "Voz futura ativada.");
      }

      if (target.id === "streamClearBtn") {
        state.lastTranscript = "";
        state.logs = [];
        state.lastDecision = "Aguardando fala.";
        $("#streamManualTranscript") && ($("#streamManualTranscript").value = "");
        setStatus("idle", "Stream limpa.");
        render();
      }

      if (target.id === "streamUseExampleBtn") {
        const input = $("#streamManualTranscript");
        if (input) input.value = "Noelle, qual é o próximo passo?";
      }

      if (target.id === "streamCheckGuardBtn") {
        const input = $("#streamManualTranscript");
        const value = input?.value || "";
        state.lastTranscript = value;

        const decision = shouldRespond(value);

        if (decision.ok) {
          setStatus("ready_to_answer", decision.reason);
          $("#streamFutureAnswer") && ($("#streamFutureAnswer").textContent = "Pergunta aprovada. Na fase futura, isto será enviado ao Ollama.");
          addLog("guard", `Aprovado: ${value}`);
        } else {
          setStatus("blocked", decision.reason);
          $("#streamFutureAnswer") && ($("#streamFutureAnswer").textContent = "Bloqueado. A IA não responderia.");
          addLog("guard", `${decision.reason}: ${value || "(vazio)"}`);
        }

        render();
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;

      if (target.id === "streamModeSelect") {
        state.mode = target.value;
        addLog("modo", `Modo alterado para: ${target.value}`);
      }
    });
  }

  function pulseMeter(active) {
    const bar = $("#streamFakeMeterBar");
    if (!bar) return;
    bar.classList.toggle("is-active", !!active);
  }

  function renderLog() {
    const log = $("#streamLog");
    if (!log) return;

    if (!state.logs.length) {
      log.innerHTML = '<p class="muted">Nenhum evento ainda.</p>';
      return;
    }

    log.innerHTML = state.logs.map((item) => `
      <div class="stream-v19829-log-item">
        <span>${escapeText(item.at)}</span>
        <strong>${escapeText(item.kind)}</strong>
        <p>${escapeText(item.message)}</p>
      </div>
    `).join("");
  }

  function render() {
    const transcript = $("#streamLastTranscript");
    if (transcript) transcript.textContent = state.lastTranscript || "Nenhuma fala ainda.";

    const mode = $("#streamModeSelect");
    if (mode && mode.value !== state.mode) mode.value = state.mode;

    const pill = $("#streamStatePill");
    if (pill) {
      pill.textContent = STATUS_LABELS[state.status] || state.status;
      pill.dataset.state = state.status;
    }

    const detail = $("#streamStateDetail");
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

  window.NoelleStreamPageV19829 = Object.freeze({
    version: VERSION,
    ensure,
    render,
    shouldRespond,
    getState: () => ({ ...state })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
