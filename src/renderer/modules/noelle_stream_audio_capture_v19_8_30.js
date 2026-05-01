"use strict";
// NOELLE_V19_8_32_SEGMENT_RECORDER_EVENTS
/* Noelle/Yoru V19.8.33 — Stream Mic Button Fix
 - microfone só liga por botão;
 - medidor real de volume;
 - desliga tracks ao parar/ocultar;
 - NÃO chama STT/Ollama/TTS.
*/
(() => {
  const VERSION = "19.8.33-stream-mic-button-fix-2026";
  const state = { active: false, level: 0, lastError: "", startedAt: null, stream: null, audioContext: null, analyser: null, source: null, raf: 0, buffer: null };
  const qs = (selector, root = document) => root.querySelector(selector);
  const now = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  function escapeText(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
  function setPill(status, detail, kind) {
    const pill = qs("#streamStatePill"); const detailEl = qs("#streamStateDetail");
    if (pill) { pill.textContent = status; pill.dataset.state = kind || (state.active ? "listening" : "idle"); }
    if (detailEl) detailEl.textContent = detail;
  }
  function addLog(kind, message) {
    const log = qs("#streamLog"); if (!log) return;
    const empty = log.querySelector(".muted"); if (empty) log.innerHTML = "";
    const item = document.createElement("div"); item.className = "stream-v19829-log-item";
    item.innerHTML = `<strong>${escapeText(now())} ${escapeText(kind)}</strong><span>${escapeText(message)}</span>`;
    log.prepend(item);
  }
  function setMeter(level) {
    const bar = qs("#streamFakeMeterBar");
    const pct = Math.max(0, Math.min(100, Math.round(Number(level || 0) * 100)));
    if (bar) { bar.classList.toggle("is-active", state.active); bar.style.width = (state.active ? Math.max(6, pct) : 0) + "%"; }
    window.dispatchEvent(new CustomEvent("noelle-stream-audio-level-v19830", { detail: { version: VERSION, level: Number(level || 0), pct, active: state.active } }));
  }
  function computeLevel() {
    if (!state.analyser || !state.buffer) return 0;
    state.analyser.getByteTimeDomainData(state.buffer);
    let sum = 0;
    for (let i = 0; i < state.buffer.length; i += 1) { const centered = (state.buffer[i] - 128) / 128; sum += centered * centered; }
    return Math.min(1, Math.sqrt(sum / state.buffer.length) * 4.2);
  }
  function loop() { if (!state.active) return; state.level = computeLevel(); setMeter(state.level); state.raf = requestAnimationFrame(loop); }
  async function start() {
    if (state.active) { setPill("Escutando", "Microfone já está ligado.", "listening"); return { ok: true, alreadyActive: true }; }
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "getUserMedia indisponível neste ambiente."; state.lastError = message; setPill("Erro", message, "error"); addLog("mic", message); return { ok: false, error: message };
    }
    try {
      setPill("Permissão do microfone", "Aguardando permissão do sistema...", "listening"); addLog("mic", "Solicitando permissão do microfone.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { stream.getTracks().forEach((track) => track.stop()); const message = "AudioContext indisponível."; state.lastError = message; setPill("Erro", message, "error"); addLog("mic", message); return { ok: false, error: message }; }
      const audioContext = new AudioContextClass(); const analyser = audioContext.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaStreamSource(stream); source.connect(analyser);
      Object.assign(state, { stream, audioContext, analyser, source, buffer: new Uint8Array(analyser.frequencyBinCount), active: true, startedAt: Date.now(), lastError: "" });
      setPill("Escutando", "Microfone ligado por botão. Fase atual: medidor/VAD/trecho local.", "listening"); addLog("mic", "Microfone ligado. Nenhum serviço externo será chamado nesta fase.");
      window.dispatchEvent(new CustomEvent("noelle-stream-mic-start-v19832", { detail: { stream, version: VERSION } }));
      loop(); return { ok: true };
    } catch (err) {
      const message = err?.message || String(err); state.lastError = message; state.active = false; setMeter(0);
      window.dispatchEvent(new CustomEvent("noelle-stream-mic-stop-v19832", { detail: { version: VERSION, reason: message } }));
      setPill("Erro no microfone", message, "error"); addLog("mic", "Falha ao ligar microfone: " + message); return { ok: false, error: message };
    }
  }
  async function stop(reason = "Microfone desligado.") {
    const wasActive = state.active; state.active = false;
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
    try { state.stream?.getTracks?.().forEach((track) => track.stop()); } catch (_) {}
    try { if (state.audioContext && state.audioContext.state !== "closed") await state.audioContext.close(); } catch (_) {}
    Object.assign(state, { stream: null, audioContext: null, analyser: null, source: null, buffer: null, level: 0 });
    setMeter(0); window.dispatchEvent(new CustomEvent("noelle-stream-mic-stop-v19832", { detail: { version: VERSION, reason } }));
    if (wasActive) { setPill("Parado", reason, "idle"); addLog("mic", reason); }
    return { ok: true };
  }
  function bindButtons() {
    if (window.__NOELLE_STREAM_AUDIO_V19833_BOUND__) return; window.__NOELLE_STREAM_AUDIO_V19833_BOUND__ = true;
    document.addEventListener("click", (event) => { const t = event.target; if (!(t instanceof HTMLElement)) return; if (t.id === "streamStartBtn") setTimeout(start, 60); if (t.id === "streamStopBtn") setTimeout(() => stop("Microfone desligado pelo botão Parar escuta."), 60); }, true);
    document.addEventListener("visibilitychange", () => { if (document.hidden && state.active) stop("Microfone desligado porque a janela ficou oculta."); });
    window.addEventListener("beforeunload", () => { try { state.stream?.getTracks?.().forEach((track) => track.stop()); } catch (_) {} });
  }
  window.NoelleStreamAudioCaptureV19830 = Object.freeze({ version: VERSION, start, stop, getState: () => ({ active: state.active, level: state.level, lastError: state.lastError, startedAt: state.startedAt }), getInternalStream: () => state.stream });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindButtons, { once: true }); else bindButtons();
})();
