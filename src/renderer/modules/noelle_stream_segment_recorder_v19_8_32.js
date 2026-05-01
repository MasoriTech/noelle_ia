"use strict";

/*
  Noelle/Yoru V19.8.32 — Stream Segment Recorder
  Fase 4:
  - grava o trecho de áudio em memória entre VAD start e VAD finish;
  - não salva em disco;
  - não transcreve;
  - não envia para IA;
  - não gera voz.
*/

(() => {
  const VERSION = "19.8.32-stream-segment-recorder-2026";

  const state = {
    stream: null,
    recorder: null,
    chunks: [],
    recording: false,
    lastBlob: null,
    lastBlobUrl: "",
    lastDurationMs: 0,
    lastSizeBytes: 0,
    startedAt: 0,
    segments: 0,
    lastError: ""
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

  function addLog(kind, message) {
    const log = qs("#streamLog");
    if (!log) return;

    const empty = log.querySelector(".muted");
    if (empty) log.innerHTML = "";

    const item = document.createElement("div");
    item.className = "stream-v19829-log-item";
    item.innerHTML = `
      <span>${escapeText(nowTime())}</span>
      <strong>${escapeText(kind)}</strong>
      <p>${escapeText(message)}</p>
    `;
    log.prepend(item);
  }

  function setStatus(label, detail, kind = "listening") {
    const pill = qs("#streamStatePill");
    const detailEl = qs("#streamStateDetail");

    if (pill) {
      pill.textContent = label;
      pill.dataset.state = kind;
    }

    if (detailEl) detailEl.textContent = detail;
  }

  function chooseMimeType() {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];

    if (!window.MediaRecorder) return "";

    return types.find((type) => {
      try {
        return MediaRecorder.isTypeSupported(type);
      } catch (_) {
        return false;
      }
    }) || "";
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function ensurePanel() {
    if (qs("#streamSegmentPanelV19832")) return;

    const root =
      qs("#streamPageV19829 .stream-v19829-shell") ||
      qs("#streamPageV19830c .stream-v19829-shell") ||
      qs('.page[data-page="stream"] .stream-v19829-shell') ||
      qs('.page[data-page="stream"]');

    if (!root) return;

    const card = document.createElement("section");
    card.id = "streamSegmentPanelV19832";
    card.className = "stream-v19829-card";
    card.setAttribute("data-noelle-segment-v19-8-32", "true");
    card.innerHTML = `
      <h3>Trecho de áudio</h3>
      <div class="stream-v19832-segment-grid">
        <div>
          <strong id="streamSegmentStateV19832">Aguardando fala</strong>
          <p id="streamSegmentDetailV19832" class="muted">Quando o VAD detectar fala, o trecho será gravado em memória.</p>
        </div>
        <div class="stream-v19832-segment-stats">
          <span>Trechos: <b id="streamSegmentCountV19832">0</b></span>
          <span>Duração: <b id="streamSegmentDurationV19832">0ms</b></span>
          <span>Tamanho: <b id="streamSegmentSizeV19832">0 B</b></span>
        </div>
      </div>
      <audio id="streamSegmentAudioV19832" controls hidden></audio>
      <p class="stream-v19829-note">Fase 4: gravação local em memória. Transcrição vem depois.</p>
    `;

    root.appendChild(card);
  }

  function updatePanel(label, detail) {
    ensurePanel();

    const stateEl = qs("#streamSegmentStateV19832");
    const detailEl = qs("#streamSegmentDetailV19832");
    const countEl = qs("#streamSegmentCountV19832");
    const durationEl = qs("#streamSegmentDurationV19832");
    const sizeEl = qs("#streamSegmentSizeV19832");
    const audioEl = qs("#streamSegmentAudioV19832");

    if (stateEl) stateEl.textContent = label;
    if (detailEl) detailEl.textContent = detail;
    if (countEl) countEl.textContent = String(state.segments);
    if (durationEl) durationEl.textContent = `${Math.round(state.lastDurationMs)}ms`;
    if (sizeEl) sizeEl.textContent = formatBytes(state.lastSizeBytes);

    if (audioEl) {
      if (state.lastBlobUrl) {
        audioEl.hidden = false;
        if (audioEl.src !== state.lastBlobUrl) audioEl.src = state.lastBlobUrl;
      } else {
        audioEl.hidden = true;
      }
    }
  }

  function setStream(stream) {
    state.stream = stream || null;
    if (state.stream) {
      updatePanel("Microfone pronto", "Aguardando o VAD detectar fala para gravar o trecho.");
      addLog("segmento", "Stream do microfone recebido pelo gravador de trechos.");
    } else {
      updatePanel("Aguardando microfone", "Clique em Iniciar escuta para liberar o microfone.");
    }
  }

  function cleanupLastBlobUrl() {
    if (state.lastBlobUrl) {
      try {
        URL.revokeObjectURL(state.lastBlobUrl);
      } catch (_) {}
    }
    state.lastBlobUrl = "";
  }

  function startSegment(eventDetail = {}) {
    if (state.recording) return { ok: true, alreadyRecording: true };

    ensurePanel();

    if (!window.MediaRecorder) {
      state.lastError = "MediaRecorder indisponível.";
      updatePanel("Erro", state.lastError);
      addLog("segmento", state.lastError);
      return { ok: false, error: state.lastError };
    }

    if (!state.stream) {
      const current = window.NoelleStreamAudioCaptureV19830?.getInternalStream?.();
      if (current) state.stream = current;
    }

    if (!state.stream) {
      state.lastError = "Stream do microfone indisponível.";
      updatePanel("Sem stream", "Ligue o microfone antes de falar.");
      addLog("segmento", "Não foi possível iniciar gravação: stream indisponível.");
      return { ok: false, error: state.lastError };
    }

    try {
      state.chunks = [];
      state.startedAt = Date.now();
      cleanupLastBlobUrl();

      const mimeType = chooseMimeType();
      const options = mimeType ? { mimeType } : undefined;

      const recorder = new MediaRecorder(state.stream, options);
      state.recorder = recorder;
      state.recording = true;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) state.chunks.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        finishBlob();
      }, { once: true });

      recorder.start(120);

      setStatus("Gravando fala", "O trecho está sendo gravado em memória. Ainda não há transcrição.", "ready_to_answer");
      updatePanel("Gravando", "Fala detectada. Gravando trecho em memória.");
      addLog("segmento", "Gravação do trecho iniciada.");
      window.dispatchEvent(new CustomEvent("noelle-stream-segment-recording-start-v19832", {
        detail: { version: VERSION, at: Date.now(), vad: eventDetail }
      }));

      return { ok: true };
    } catch (err) {
      state.recording = false;
      state.recorder = null;
      state.lastError = err?.message || String(err);
      updatePanel("Erro", state.lastError);
      addLog("segmento", "Falha ao iniciar gravação: " + state.lastError);
      return { ok: false, error: state.lastError };
    }
  }

  function stopSegment(reason = "Trecho finalizado pelo VAD.") {
    if (!state.recording || !state.recorder) return { ok: true, idle: true };

    try {
      state.recording = false;
      if (state.recorder.state !== "inactive") state.recorder.stop();
      updatePanel("Finalizando", "Fechando trecho de áudio em memória.");
      addLog("segmento", reason);
      return { ok: true };
    } catch (err) {
      state.recording = false;
      state.lastError = err?.message || String(err);
      updatePanel("Erro", state.lastError);
      addLog("segmento", "Falha ao parar gravação: " + state.lastError);
      return { ok: false, error: state.lastError };
    }
  }

  function finishBlob() {
    const duration = Math.max(0, Date.now() - state.startedAt);
    const mimeType = state.chunks[0]?.type || chooseMimeType() || "audio/webm";
    const blob = new Blob(state.chunks, { type: mimeType });

    state.lastBlob = blob;
    state.lastDurationMs = duration;
    state.lastSizeBytes = blob.size;
    state.segments += 1;
    state.recorder = null;
    state.recording = false;
    state.chunks = [];
    state.lastBlobUrl = URL.createObjectURL(blob);

    setStatus("Trecho gravado", `Trecho em memória: ${Math.round(duration)}ms, ${formatBytes(blob.size)}.`, "waiting_trigger");
    updatePanel("Trecho pronto", "Áudio guardado em memória para a próxima fase.");
    addLog("segmento", `Trecho gravado em memória: ${Math.round(duration)}ms, ${formatBytes(blob.size)}.`);

    window.dispatchEvent(new CustomEvent("noelle-stream-segment-ready-v19832", {
      detail: {
        version: VERSION,
        blob,
        blobUrl: state.lastBlobUrl,
        durationMs: duration,
        sizeBytes: blob.size,
        mimeType: blob.type
      }
    }));
  }

  function clearSegment() {
    if (state.recording) stopSegment("Trecho cancelado por limpeza.");
    cleanupLastBlobUrl();
    state.lastBlob = null;
    state.lastDurationMs = 0;
    state.lastSizeBytes = 0;
    state.chunks = [];
    updatePanel("Limpo", "Nenhum trecho de áudio em memória.");
  }

  function bind() {
    if (window.__NOELLE_STREAM_SEGMENT_RECORDER_V19832_BOUND__) return;
    window.__NOELLE_STREAM_SEGMENT_RECORDER_V19832_BOUND__ = true;

    window.addEventListener("noelle-stream-mic-start-v19832", (event) => {
      setStream(event.detail?.stream || null);
    });

    window.addEventListener("noelle-stream-mic-stop-v19832", () => {
      stopSegment("Microfone desligado; trecho atual cancelado.");
      setStream(null);
    });

    window.addEventListener("noelle-stream-vad-start-v19831", (event) => {
      startSegment(event.detail || {});
    });

    window.addEventListener("noelle-stream-vad-finish-v19831", () => {
      stopSegment("VAD finalizou o trecho.");
    });

    window.addEventListener("noelle-stream-vad-cancel-v19831", () => {
      stopSegment("VAD cancelou o trecho.");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "streamClearBtn") {
        setTimeout(clearSegment, 80);
      }

      if (target.id === "streamStopBtn") {
        setTimeout(() => {
          stopSegment("Microfone parado pelo botão.");
        }, 80);
      }

      if (target.closest('[data-target="stream"]')) {
        setTimeout(ensurePanel, 180);
      }
    }, true);

    ensurePanel();
  }

  function getState() {
    return {
      recording: state.recording,
      hasSegment: !!state.lastBlob,
      lastDurationMs: state.lastDurationMs,
      lastSizeBytes: state.lastSizeBytes,
      segments: state.segments,
      lastError: state.lastError
    };
  }

  window.NoelleStreamSegmentRecorderV19832 = Object.freeze({
    version: VERSION,
    bind,
    startSegment,
    stopSegment,
    clearSegment,
    getState
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
