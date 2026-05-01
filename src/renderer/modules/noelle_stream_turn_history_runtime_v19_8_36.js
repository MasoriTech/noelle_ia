(() => {
  "use strict";

  /*
    Noelle Stream V19.8.36 — Turn History Runtime

    Objetivo:
    - Finalizar a camada de histórico da aba Stream existente.
    - Não recriar Stream.
    - Não tocar em Avatar/Loadfile/viewers 3D.
    - Guardar pergunta/transcrição + resposta IA.
    - Exportar/copiar/limpar histórico.
    - Dar base para memória futura sem ligar memória permanente ainda.
  */

  const VERSION = "19.8.36-turn-history-existing-only-2026";
  const STORAGE_KEY = "noelle.stream.turnHistory.v19_8_36";
  const MAX_TURNS = 50;

  const state = {
    installed: false,
    turns: [],
    lastTranscript: "",
    lastAnswer: "",
    lastTurnHash: "",
    observer: null,
    retryTimer: null
  };

  const PLACEHOLDER_PATTERNS = [
    /a ia ainda não responde/i,
    /ia ainda não responde/i,
    /aqui entrará ollama/i,
    /pergunta aprovada/i,
    /aguardando/i,
    /nenhuma fala/i,
    /sem resposta/i
  ];

  function log(...args) {
    console.log("[stream-history-v19.8.36]", ...args);
  }

  function warn(...args) {
    console.warn("[stream-history-v19.8.36]", ...args);
  }

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function normalize(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function multiline(value) {
    return String(value ?? "").replace(/\r\n/g, "\n").trim();
  }

  function hashText(value) {
    const input = normalize(value);
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return String(hash);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return iso || "";
    }
  }

  function getStreamPage() {
    return $('.page[data-page="stream"]') || $("#streamPageV19829") || document.body || document;
  }

  function getTranscriptText() {
    const candidates = [
      $("#streamLastTranscript"),
      $("#streamManualTranscript"),
      $("#streamTranscriptText"),
      $('[data-stream-transcript="true"]'),
      $('[data-noelle-stream-transcript="true"]')
    ];

    for (const el of candidates) {
      if (!el) continue;
      const value = "value" in el ? el.value : el.textContent;
      const cleaned = normalize(value);
      if (cleaned) return cleaned;
    }

    return state.lastTranscript || "";
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

  function getAnswerText() {
    const answer = getAnswerElement();
    if (!answer) return state.lastAnswer || "";
    return normalize(answer.textContent || answer.value || "");
  }

  function isPlaceholder(value) {
    const text = normalize(value);
    if (!text) return true;
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
  }

  function isUsefulTurn(question, answer) {
    const q = normalize(question);
    const a = normalize(answer);
    if (!q && !a) return false;
    if (a && isPlaceholder(a)) return false;
    return Boolean(q || a);
  }

  function buildTurn(question, answer, source = "runtime") {
    const q = multiline(question);
    const a = multiline(answer);
    const createdAt = nowIso();

    return {
      id: "turn_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      createdAt,
      question: q,
      answer: a,
      source,
      hash: hashText(q + "\n---\n" + a)
    };
  }

  function loadTurns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.turns = [];
        return;
      }

      const parsed = JSON.parse(raw);
      state.turns = Array.isArray(parsed) ? parsed.slice(0, MAX_TURNS) : [];
    } catch {
      state.turns = [];
    }
  }

  function saveTurns() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.turns.slice(0, MAX_TURNS)));
    } catch (err) {
      warn("falha ao salvar histórico", err);
    }
  }

  function setStatus(message, kind = "info") {
    const el = $("#streamHistoryStatusV19836");
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }

  function addTurn(question, answer, source = "runtime") {
    if (!isUsefulTurn(question, answer)) {
      setStatus("Nada útil para salvar.", "warn");
      return null;
    }

    const turn = buildTurn(question, answer, source);

    if (turn.hash === state.lastTurnHash || state.turns.some((item) => item.hash === turn.hash)) {
      setStatus("Turno já estava salvo.", "info");
      return null;
    }

    state.lastTurnHash = turn.hash;
    state.turns.unshift(turn);
    state.turns = state.turns.slice(0, MAX_TURNS);
    saveTurns();
    renderHistory();

    window.dispatchEvent(new CustomEvent("noelle:stream-turn-saved", {
      detail: { turn, total: state.turns.length }
    }));

    setStatus("Turno salvo no histórico.", "ok");
    return turn;
  }

  function collectAndSave(source = "manual") {
    const question = state.lastTranscript || getTranscriptText();
    const answer = state.lastAnswer || getAnswerText();
    return addTurn(question, answer, source);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function renderHistory() {
    const list = $("#streamHistoryListV19836");
    const counter = $("#streamHistoryCountV19836");

    if (counter) counter.textContent = String(state.turns.length);

    if (!list) return;

    if (!state.turns.length) {
      list.innerHTML = `<div style="opacity:.62;font-size:12px;">Nenhum turno salvo ainda.</div>`;
      return;
    }

    list.innerHTML = state.turns.slice(0, 10).map((turn) => {
      const q = escapeHtml(turn.question || "—");
      const a = escapeHtml(turn.answer || "—");
      return `
        <article data-turn-id="${escapeHtml(turn.id)}" style="padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025);">
          <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <strong style="font-size:12px;">${escapeHtml(formatTime(turn.createdAt))}</strong>
            <button type="button" data-copy-turn="${escapeHtml(turn.id)}" style="font-size:11px;">copiar</button>
          </div>
          <div style="font-size:12px;line-height:1.35;opacity:.82;"><strong>Você:</strong> ${q}</div>
          <div style="font-size:12px;line-height:1.35;margin-top:6px;opacity:.9;"><strong>IA:</strong> ${a}</div>
        </article>
      `;
    }).join("");
  }

  function exportText() {
    if (!state.turns.length) return "";

    return state.turns.map((turn, index) => {
      return [
        `#${state.turns.length - index} — ${turn.createdAt}`,
        `Você: ${turn.question || "—"}`,
        `IA: ${turn.answer || "—"}`
      ].join("\n");
    }).join("\n\n");
  }

  async function copyText(value) {
    const text = String(value ?? "");

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function downloadHistory() {
    const content = exportText();

    if (!content) {
      setStatus("Histórico vazio.", "warn");
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    link.href = url;
    link.download = "noelle_stream_history_" + stamp + ".txt";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Histórico exportado.", "ok");
  }

  function clearHistory() {
    state.turns = [];
    state.lastTurnHash = "";
    saveTurns();
    renderHistory();
    setStatus("Histórico limpo.", "info");
  }

  function ensurePanel() {
    const page = getStreamPage();
    if (!page || $("#streamHistoryPanelV19836")) return;

    const anchor =
      $("#streamTTSPanelV19835") ||
      $("#streamAIReplyPanel") ||
      $("#streamFutureAnswer")?.closest?.("section, .card, div") ||
      $("#streamFutureAnswer")?.parentElement ||
      $("#streamLog")?.closest?.("section, .card, div") ||
      $("#streamLog")?.parentElement ||
      page;

    const panel = document.createElement("section");
    panel.id = "streamHistoryPanelV19836";
    panel.setAttribute("data-noelle-stream-history", VERSION);
    panel.style.marginTop = "14px";
    panel.style.padding = "14px";
    panel.style.border = "1px solid rgba(255,255,255,.10)";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(255,255,255,.035)";

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <strong style="display:block;font-size:15px;">Histórico da Stream</strong>
          <span id="streamHistoryStatusV19836" data-kind="info" style="font-size:12px;opacity:.72;">
            Turnos salvos: <span id="streamHistoryCountV19836">0</span>
          </span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="streamSaveTurnBtnV19836" type="button">Salvar turno</button>
          <button id="streamCopyHistoryBtnV19836" type="button">Copiar histórico</button>
          <button id="streamExportHistoryBtnV19836" type="button">Exportar</button>
          <button id="streamClearHistoryBtnV19836" type="button">Limpar</button>
        </div>
      </div>
      <div id="streamHistoryListV19836" style="display:grid;gap:8px;max-height:260px;overflow:auto;margin-top:12px;padding-right:4px;"></div>
      <p style="margin:10px 0 0;font-size:12px;opacity:.66;">
        Histórico local temporário no navegador. Não mexe em memória permanente ainda.
      </p>
    `;

    if (anchor === page) {
      page.appendChild(panel);
    } else {
      anchor.insertAdjacentElement("afterend", panel);
    }
  }

  function bindControls() {
    if (document.__streamHistoryV19836Bound) return;
    document.__streamHistoryV19836Bound = true;

    document.addEventListener("click", async (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      if (target.id === "streamSaveTurnBtnV19836") {
        collectAndSave("manual-button");
      }

      if (target.id === "streamCopyHistoryBtnV19836") {
        const ok = await copyText(exportText());
        setStatus(ok ? "Histórico copiado." : "Falha ao copiar histórico.", ok ? "ok" : "error");
      }

      if (target.id === "streamExportHistoryBtnV19836") {
        downloadHistory();
      }

      if (target.id === "streamClearHistoryBtnV19836") {
        clearHistory();
      }

      const copyTurnId = target.getAttribute("data-copy-turn");
      if (copyTurnId) {
        const turn = state.turns.find((item) => item.id === copyTurnId);
        if (!turn) return;

        const ok = await copyText(`Você: ${turn.question || "—"}\nIA: ${turn.answer || "—"}`);
        setStatus(ok ? "Turno copiado." : "Falha ao copiar turno.", ok ? "ok" : "error");
      }
    }, true);
  }

  function watchAnswerElement() {
    if (state.observer) return;

    const answer = getAnswerElement();
    if (!answer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = setTimeout(watchAnswerElement, 700);
      return;
    }

    state.observer = new MutationObserver(() => {
      const value = getAnswerText();
      if (!value || isPlaceholder(value)) return;

      state.lastAnswer = value;

      const q = getTranscriptText();
      if (q) state.lastTranscript = q;

      clearTimeout(state.retryTimer);
      state.retryTimer = setTimeout(() => {
        addTurn(state.lastTranscript || getTranscriptText(), state.lastAnswer || getAnswerText(), "observer");
      }, 650);
    });

    state.observer.observe(answer, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function bindEvents() {
    if (window.__streamHistoryV19836Events) return;
    window.__streamHistoryV19836Events = true;

    window.addEventListener("noelle:stream-transcript-ready", (event) => {
      const value = normalize(event?.detail?.text || event?.detail?.transcript || "");
      if (value) state.lastTranscript = value;
    });

    window.addEventListener("noelle:stream-segment-transcribed", (event) => {
      const value = normalize(event?.detail?.text || event?.detail?.transcript || "");
      if (value) state.lastTranscript = value;
    });

    window.addEventListener("noelle:stream-ai-reply", (event) => {
      const answer = normalize(event?.detail?.answer || event?.detail?.text || "");
      if (!answer || isPlaceholder(answer)) return;

      state.lastAnswer = answer;
      addTurn(state.lastTranscript || getTranscriptText(), answer, "ai-reply-event");
    });

    window.addEventListener("noelle:stream-ai-reply-ready", (event) => {
      const answer = normalize(event?.detail?.answer || event?.detail?.text || getAnswerText());
      if (!answer || isPlaceholder(answer)) return;

      state.lastAnswer = answer;
      addTurn(state.lastTranscript || getTranscriptText(), answer, "ai-reply-ready-event");
    });
  }

  function ensure() {
    loadTurns();
    ensurePanel();
    renderHistory();
    bindControls();
    bindEvents();
    watchAnswerElement();
  }

  function boot() {
    if (state.installed) return;
    state.installed = true;

    ensure();
    setTimeout(ensure, 250);
    setTimeout(ensure, 800);
    setTimeout(ensure, 1500);

    window.NoelleStreamHistoryV19836 = Object.freeze({
      version: VERSION,
      ensure,
      addTurn,
      collectAndSave,
      clearHistory,
      exportText,
      getState: () => ({
        turns: state.turns.slice(),
        lastTranscript: state.lastTranscript,
        lastAnswer: state.lastAnswer
      })
    });

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
