"use strict";

/*
  Noelle/Yoru V19.8.30 — Stream Mic Button
  Fase 2:
  - microfone só liga quando o usuário aperta "Iniciar escuta";
  - mostra volume real no medidor da aba Stream;
  - "Parar escuta" desliga todas as tracks;
  - sair/ocultar janela desliga o microfone;
  - não chama serviços externos nesta fase.
*/

(() => {
  const VERSION = "19.8.30-stream-mic-button-2026";

  const state = {
    active: false,
    level: 0,
    lastError: "",
    startedAt: null,
    stream: null,
    audioContext: null,
    analyser: null,
    source: null,
    raf: 0,
    buffer: null
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function now() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeText(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function setPill(status, detail) {
    const pill = $("#streamStatePill");
    const detailEl = $("#streamStateDetail");

    if (pill) {
      pill.textContent = status;
      pill.dataset.state = state.active ? "listening" : "idle";
    }

    if (detailEl) detailEl.textContent = detail;
  }

  function addLog(kind, message) {
    const log = $("#streamLog");
    if (!log) return;

    const item = document.createElement("div");
    item.className = "stream-v19829-log-item";
    item.innerHTML = `
      <span>${escapeText(now())}</span>
      <strong>${escapeText(kind)}</strong>
      <p>${escapeText(message)}</p>
    `;

    const empty = log.querySelector(".muted");
    if (empty) log.innerHTML = "";

    log.prepend(item);
  }

  function setMeter(level) {
    const bar = $("#streamFakeMeterBar");
    if (!bar) return;

    const pct = Math.max(6, Math.min(100, Math.round(level * 100)));
    bar.classList.toggle("is-active", false);
    bar.style.width = pct + "%";

    window.dispatchEvent(new CustomEvent("noelle-stream-audio-level-v19830", {
      detail: { level, pct, active: state.active }
    }));
  }

  function computeLevel() {
    if (!state.analyser || !state.buffer) return 0;

    state.analyser.getByteTimeDomainData(state.buffer);

    let sum = 0;
    for (let i = 0; i < state.buffer.length; i += 1) {
      const centered = (state.buffer[i] - 128) / 128;
      sum += centered * centered;
    }

    const rms = Math.sqrt(sum / state.buffer.length);
    return Math.min(1, rms * 4.2);
  }

  function loop() {
    if (!state.active) return;

    state.level = computeLevel();
    setMeter(state.level);

    state.raf = requestAnimationFrame(loop);
  }

  async function start() {
    if (state.active) {
      setPill("Escutando", "Microfone já está ligado.");
      return { ok: true, alreadyActive: true };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const message = "getUserMedia indisponível neste ambiente.";
      state.lastError = message;
      setPill("Erro", message);
      addLog("mic", message);
      return { ok: false, error: message };
    }

    try {
      setPill("Permissão do microfone", "Aguardando permissão do sistema...");
      addLog("mic", "Solicitando permissão do microfone.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop());
        const message = "AudioContext indisponível.";
        state.lastError = message;
        setPill("Erro", message);
        addLog("mic", message);
        return { ok: false, error: message };
      }

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      state.stream = stream;
      state.audioContext = audioContext;
      state.analyser = analyser;
      state.source = source;
      state.buffer = new Uint8Array(analyser.frequencyBinCount);
      state.active = true;
      state.startedAt = Date.now();
      state.lastError = "";

      setPill("Escutando", "Microfone ligado por botão. Fase 2: somente medidor de volume.");
      addLog("mic", "Microfone ligado. Nenhum processamento de fala será feito nesta fase.");

      loop();

      return { ok: true };
    } catch (err) {
      const message = err?.message || String(err);
      state.lastError = message;
      state.active = false;
      setMeter(0);
      setPill("Erro no microfone", message);
      addLog("mic", "Falha ao ligar microfone: " + message);
      return { ok: false, error: message };
    }
  }

  async function stop(reason = "Microfone desligado.") {
    const wasActive = state.active;

    state.active = false;

    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    try {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    } catch (_) {}

    try {
      if (state.audioContext && state.audioContext.state !== "closed") {
        await state.audioContext.close();
      }
    } catch (_) {}

    state.stream = null;
    state.audioContext = null;
    state.analyser = null;
    state.source = null;
    state.buffer = null;
    state.level = 0;

    setMeter(0);

    if (wasActive) {
      setPill("Parado", reason);
      addLog("mic", reason);
    }

    return { ok: true };
  }

  function bindButtons() {
    if (window.__NOELLE_STREAM_AUDIO_V19830_BOUND__) return;
    window.__NOELLE_STREAM_AUDIO_V19830_BOUND__ = true;

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "streamStartBtn") {
        setTimeout(() => {
          start();
        }, 60);
      }

      if (target.id === "streamStopBtn") {
        setTimeout(() => {
          stop("Microfone desligado pelo botão Parar escuta.");
        }, 60);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.active) {
        stop("Microfone desligado porque a janela ficou oculta.");
      }
    });

    window.addEventListener("beforeunload", () => {
      if (state.active) {
        try {
          state.stream?.getTracks?.().forEach((track) => track.stop());
        } catch (_) {}
      }
    });
  }

  function getState() {
    return {
      active: state.active,
      level: state.level,
      lastError: state.lastError,
      startedAt: state.startedAt
    };
  }

  window.NoelleStreamAudioCaptureV19830 = Object.freeze({
    version: VERSION,
    start,
    stop,
    getState
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindButtons, { once: true });
  } else {
    bindButtons();
  }
})();
