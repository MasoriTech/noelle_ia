"use strict";
/*
  Noelle/Yoru Stream V19.8.33 — Finish Existing Only
  - NÃO cria uma aba Stream nova.
  - NÃO mexe em Avatar/Loadfile/viewers.
  - Finaliza a Stream existente: painel final, fila de trecho, botão de transcrição,
    status centralizado e StreamGuard no resultado transcrito.
*/
(() => {
  const VERSION = "19.8.33-finish-existing-only-2026";

  const state = {
    lastSegment: null,
    lastTranscript: "",
    transcribing: false,
    transcriptCount: 0,
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

  function normalizeTranscript(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function shouldRespond(rawText) {
    if (window.NoelleStreamPageV19829?.shouldRespond) {
      try {
        return window.NoelleStreamPageV19829.shouldRespond(rawText);
      } catch (_) {}
    }

    const t = normalizeTranscript(rawText);
    const hasWakeWord = /\b(noelle|yoru)\b/i.test(t) || /\bei (noelle|yoru)\b/i.test(t);
    const looksQuestion = /\?/.test(rawText || "") || /\b(como|por que|porque|o que|qual|quando|onde|quem|pode|consegue|devo|faco|fazer|explica|me ajuda)\b/i.test(t);

    if (!hasWakeWord) return { ok: false, reason: "bloqueado: não chamou Noelle/Yoru" };
    if (!looksQuestion) return { ok: false, reason: "bloqueado: não parece pergunta" };
    return { ok: true, reason: "aprovado: pergunta direcionada" };
  }

  function streamRoot() {
    return qs("#streamPageV19829 .stream-v19829-shell") ||
      qs("#streamPageV19830c .stream-v19829-shell") ||
      qs('.page[data-page="stream"] .stream-v19829-shell') ||
      qs('.page[data-page="stream"]') ||
      qs("#streamPageV19829") ||
      null;
  }

  function setStatus(label, detail, kind = "waiting_trigger") {
    const pill = qs("#streamStatePill");
    const detailEl = qs("#streamStateDetail");
    if (pill) {
      pill.textContent = label;
      pill.dataset.state = kind;
    }
    if (detailEl) detailEl.textContent = detail;
    window.streamSTTStatus?.(detail);
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

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function getIpcInvoke() {
    const candidates = [
      window.electron?.invoke,
      window.electronAPI?.invoke,
      window.api?.invoke,
      window.noelle?.invoke,
      window.NoelleAPI?.invoke
    ];
    const fn = candidates.find((item) => typeof item === "function");
    return fn ? fn.bind(window.electron || window.electronAPI || window.api || window.noelle || window.NoelleAPI) : null;
  }

  function ensurePanel() {
    if (qs("#streamFinalizePanelV19833")) return;
    const root = streamRoot();
    if (!root) return;

    const card = document.createElement("section");
    card.id = "streamFinalizePanelV19833";
    card.className = "stream-v19829-card";
    card.setAttribute("data-noelle-stream-finalize-v19-8-33", "true");
    card.innerHTML = `
      <h3>Finalização da Stream</h3>
      <p class="muted" id="streamFinalizeDetailV19833">Aguardando trecho de áudio em memória.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
        <button id="streamTranscribeLastBtnV19833" type="button">Transcrever último trecho</button>
        <button id="streamCopyTranscriptBtnV19833" type="button">Copiar texto</button>
        <button id="streamDebugStateBtnV19833" type="button">Debug Stream</button>
      </div>
      <div id="streamFinalizeMetaV19833" class="muted" style="margin-top:8px;">Trechos prontos: 0</div>
      <p class="muted" style="margin-top:8px;">Este módulo só finaliza a Stream existente. IA/Ollama/TTS continuam fora desta fase.</p>
    `;

    const segmentPanel = qs("#streamSegmentPanelV19832", root);
    if (segmentPanel && segmentPanel.parentElement) {
      segmentPanel.insertAdjacentElement("afterend", card);
    } else {
      root.appendChild(card);
    }
  }

  function updatePanel() {
    ensurePanel();
    const detail = qs("#streamFinalizeDetailV19833");
    const meta = qs("#streamFinalizeMetaV19833");
    const btn = qs("#streamTranscribeLastBtnV19833");

    if (detail) {
      if (state.transcribing) detail.textContent = "Transcrevendo o último trecho...";
      else if (state.lastSegment) detail.textContent = "Trecho pronto para transcrição.";
      else detail.textContent = "Aguardando trecho de áudio em memória.";
    }

    if (meta) {
      const seg = state.lastSegment;
      meta.textContent = seg
        ? `Trechos transcritos: ${state.transcriptCount} · Último: ${Math.round(seg.durationMs || 0)}ms · ${formatBytes(seg.sizeBytes)}`
        : `Trechos transcritos: ${state.transcriptCount}`;
    }

    if (btn) btn.disabled = !state.lastSegment || state.transcribing;
  }

  function setTranscript(text, source = "stt") {
    const value = String(text ?? "").trim();
    state.lastTranscript = value;
    if (value) state.transcriptCount += 1;

    const transcriptEl = qs("#streamLastTranscript");
    if (transcriptEl) transcriptEl.textContent = value || "Nenhuma fala transcrita.";

    const decision = shouldRespond(value);
    const answerEl = qs("#streamFutureAnswer");

    if (!value) {
      setStatus("Sem transcrição", "Nenhum texto foi retornado pelo STT.", "blocked");
      if (answerEl) answerEl.textContent = "Sem texto para enviar ao guard.";
      addLog("stt", "Transcrição vazia.");
    } else if (decision.ok) {
      setStatus("Pergunta aprovada", decision.reason, "ready_to_answer");
      if (answerEl) {
        answerEl.textContent = "Pergunta aprovada pela StreamGuard. Próximo passo futuro: enviar ao Ollama.";
      }
      addLog("guard", `Aprovado (${source}): ${value}`);
    } else {
      setStatus("Bloqueado", decision.reason, "blocked");
      if (answerEl) answerEl.textContent = "Bloqueado pela StreamGuard. A IA não responderia.";
      addLog("guard", `${decision.reason}: ${value}`);
    }

    window.dispatchEvent(new CustomEvent("noelle-stream-transcript-ready-v19833", {
      detail: { version: VERSION, text: value, source, decision }
    }));

    updatePanel();
  }

  async function blobToPayload(blob, detail = {}) {
    const buffer = await blob.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buffer));
    return {
      bytes,
      mimeType: blob.type || detail.mimeType || "audio/webm",
      durationMs: detail.durationMs || 0,
      sizeBytes: blob.size || detail.sizeBytes || bytes.length,
      source: "stream-v19.8.33"
    };
  }

  function extractText(result) {
    if (typeof result === "string") return result;
    if (!result || typeof result !== "object") return "";
    return result.text || result.transcript || result.result || result.message || "";
  }

  async function transcribeLastSegment() {
    ensurePanel();
    if (!state.lastSegment?.blob) {
      setStatus("Sem trecho", "Nenhum trecho gravado em memória ainda.", "blocked");
      addLog("stt", "Transcrição solicitada sem trecho pronto.");
      return { ok: false, error: "no-segment" };
    }

    const invoke = getIpcInvoke();
    if (!invoke) {
      setStatus("STT não conectado", "Preload/Electron ainda não expôs um canal de transcrição.", "blocked");
      addLog("stt", "Trecho pronto, mas nenhum IPC de STT foi encontrado.");
      updatePanel();
      return { ok: false, error: "ipc-missing" };
    }

    state.transcribing = true;
    state.lastError = "";
    updatePanel();
    setStatus("Transcrevendo", "Enviando último trecho para o STT local...", "thinking");

    const payload = await blobToPayload(state.lastSegment.blob, state.lastSegment);
    const channels = [
      ["stream:transcribe-segment", payload],
      ["stream-transcribe-segment", payload],
      ["stream-stt-transcribe", payload],
      ["stream-stt", payload],
      ["stream-stt", "last_segment.wav"]
    ];

    for (const [channel, arg] of channels) {
      try {
        const result = await invoke(channel, arg);
        const text = extractText(result);
        if (text) {
          state.transcribing = false;
          setTranscript(text, channel);
          addLog("stt", `Transcrição recebida via ${channel}.`);
          return { ok: true, channel, text };
        }
      } catch (err) {
        state.lastError = err?.message || String(err);
      }
    }

    state.transcribing = false;
    updatePanel();
    setStatus("STT sem retorno", "Nenhum canal retornou texto. Verifique preload/main process.", "blocked");
    addLog("stt", "Canais testados, mas nenhum retornou transcrição.");
    return { ok: false, error: state.lastError || "no-text" };
  }

  async function copyTranscript() {
    if (!state.lastTranscript) {
      addLog("texto", "Nada para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(state.lastTranscript);
      addLog("texto", "Transcrição copiada.");
    } catch {
      addLog("texto", "Clipboard indisponível.");
    }
  }

  function debugState() {
    const audio = window.NoelleStreamAudioCaptureV19830?.getState?.();
    const vad = window.NoelleStreamVadV19831?.getState?.();
    const segment = window.NoelleStreamSegmentRecorderV19832?.getState?.();
    console.table({ audio, vad, segment, finalize: { ...state, lastSegment: !!state.lastSegment } });
    addLog("debug", "Estado da Stream enviado ao console.");
  }

  function bind() {
    if (window.__NOELLE_STREAM_FINALIZE_V19833_BOUND__) return;
    window.__NOELLE_STREAM_FINALIZE_V19833_BOUND__ = true;

    window.addEventListener("noelle-stream-segment-ready-v19832", (event) => {
      const detail = event.detail || {};
      state.lastSegment = {
        blob: detail.blob,
        blobUrl: detail.blobUrl || "",
        durationMs: detail.durationMs || 0,
        sizeBytes: detail.sizeBytes || detail.blob?.size || 0,
        mimeType: detail.mimeType || detail.blob?.type || "audio/webm"
      };
      setStatus("Trecho pronto", "Último áudio está pronto para transcrever.", "waiting_trigger");
      addLog("fila", `Trecho recebido pela finalização: ${Math.round(state.lastSegment.durationMs)}ms, ${formatBytes(state.lastSegment.sizeBytes)}.`);
      updatePanel();
    });

    window.addEventListener("noelle-stream-mic-stop-v19832", () => {
      updatePanel();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "streamTranscribeLastBtnV19833") transcribeLastSegment();
      if (target.id === "streamCopyTranscriptBtnV19833") copyTranscript();
      if (target.id === "streamDebugStateBtnV19833") debugState();
      if (target.id === "streamClearBtn") {
        state.lastSegment = null;
        state.lastTranscript = "";
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

  window.NoelleStreamFinalizeV19833 = Object.freeze({
    version: VERSION,
    bind,
    ensurePanel,
    transcribeLastSegment,
    setTranscript,
    shouldRespond,
    getState: () => ({ ...state, lastSegment: !!state.lastSegment })
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();