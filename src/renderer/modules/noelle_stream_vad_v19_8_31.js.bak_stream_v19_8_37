"use strict";
/* Noelle/Yoru V19.8.33 — Stream VAD Simple Fix
 - detecta fala/silêncio pelo nível emitido pelo microfone;
 - NÃO transcreve, NÃO chama IA, NÃO gera voz.
*/
(() => {
  const VERSION = "19.8.33-stream-vad-simple-fix-2026";
  const config = { speechThreshold: 0.12, releaseThreshold: 0.07, minSpeechMs: 180, silenceToFinishMs: 950 };
  const state = { enabled: true, micActive: false, speaking: false, level: 0, candidateSpeechAt: 0, speechStartedAt: 0, lastLoudAt: 0, lastEventAt: 0, lastSegmentMs: 0, segments: 0 };
  const qs = (selector, root = document) => root.querySelector(selector);
  const now = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  function escapeText(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
  function addLog(kind, message) {
    const log = qs("#streamLog"); if (!log) return;
    const empty = log.querySelector(".muted"); if (empty) log.innerHTML = "";
    const item = document.createElement("div"); item.className = "stream-v19829-log-item";
    item.innerHTML = `<strong>${escapeText(now())} ${escapeText(kind)}</strong><span>${escapeText(message)}</span>`;
    log.prepend(item);
  }
  function setStatus(label, detail, kind = "listening") {
    const pill = qs("#streamStatePill"); const detailEl = qs("#streamStateDetail");
    if (pill) { pill.textContent = label; pill.dataset.state = kind; }
    if (detailEl) detailEl.textContent = detail;
  }
  function ensurePanel() {
    if (qs("#streamVadPanelV19831")) return;
    const root = qs("#streamPageV19829 .stream-v19829-shell") || qs("#streamPageV19830c .stream-v19829-shell") || qs('.page[data-page="stream"] .stream-v19829-shell') || qs('.page[data-page="stream"]');
    if (!root) return;
    const card = document.createElement("section");
    card.id = "streamVadPanelV19831";
    card.className = "stream-v19829-card";
    card.setAttribute("data-noelle-vad-v19-8-31", VERSION);
    card.innerHTML = `
      <h3>VAD simples</h3>
      <p><strong id="streamVadStateV19831">Aguardando microfone</strong></p>
      <p id="streamVadDetailV19831" class="muted">A Fase 3 detecta fala e silêncio. Ainda não existe transcrição.</p>
      <p class="muted">Segmentos: <strong id="streamVadSegmentsV19831">0</strong> · Último trecho: <strong id="streamVadLastSegmentV19831">0ms</strong></p>`;
    const logCard = qs("#streamLog")?.closest?.("section");
    if (logCard?.parentElement === root) root.insertBefore(card, logCard);
    else root.appendChild(card);
  }
  function updatePanel(label, detail) {
    ensurePanel();
    const stateEl = qs("#streamVadStateV19831"); const detailEl = qs("#streamVadDetailV19831");
    const segmentsEl = qs("#streamVadSegmentsV19831"); const lastSegmentEl = qs("#streamVadLastSegmentV19831");
    if (stateEl) stateEl.textContent = label;
    if (detailEl) detailEl.textContent = detail;
    if (segmentsEl) segmentsEl.textContent = String(state.segments);
    if (lastSegmentEl) lastSegmentEl.textContent = `${Math.round(state.lastSegmentMs)}ms`;
  }
  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail: { version: VERSION, ...detail } })); }
  function startSpeech(ts) {
    state.speaking = true; state.speechStartedAt = ts; state.lastLoudAt = ts; state.segments += 1;
    setStatus("Fala detectada", "VAD detectou início de fala. Ainda não há transcrição.", "ready_to_answer");
    updatePanel("Fala detectada", "Continue falando. O trecho fecha depois de quase 1 segundo de silêncio.");
    addLog("vad", "Fala detectada."); emit("noelle-stream-vad-start-v19831", { level: state.level, at: ts });
  }
  function finishSpeech(ts) {
    const duration = Math.max(0, ts - state.speechStartedAt);
    state.speaking = false; state.candidateSpeechAt = 0; state.speechStartedAt = 0; state.lastLoudAt = 0; state.lastSegmentMs = duration;
    setStatus("Trecho finalizado", `Fala finalizada após silêncio. Duração aproximada: ${Math.round(duration)}ms.`, "waiting_trigger");
    updatePanel("Trecho finalizado", "Próxima fase poderá transcrever esse trecho.");
    addLog("vad", `Trecho finalizado. Duração aproximada: ${Math.round(duration)}ms.`);
    emit("noelle-stream-vad-finish-v19831", { durationMs: duration, at: ts });
  }
  function resetVad(reason = "VAD parado.") {
    const wasSpeaking = state.speaking;
    state.micActive = false; state.speaking = false; state.level = 0; state.candidateSpeechAt = 0; state.speechStartedAt = 0; state.lastLoudAt = 0;
    updatePanel("Aguardando microfone", reason);
    if (wasSpeaking) { addLog("vad", "Fala cancelada porque o microfone parou."); emit("noelle-stream-vad-cancel-v19831", { reason }); }
  }
  function onAudioLevel(event) {
    if (!state.enabled) return;
    ensurePanel();
    const detail = event.detail || {}; const active = !!detail.active; const level = Number(detail.level || 0); const ts = Date.now();
    state.micActive = active; state.level = level; state.lastEventAt = ts;
    if (!active) { resetVad("Microfone desligado."); return; }
    if (!state.speaking) {
      if (level >= config.speechThreshold) {
        if (!state.candidateSpeechAt) state.candidateSpeechAt = ts;
        const candidateMs = ts - state.candidateSpeechAt;
        updatePanel("Possível fala", `Volume acima do limite por ${Math.round(candidateMs)}ms.`);
        if (candidateMs >= config.minSpeechMs) startSpeech(ts);
      } else {
        state.candidateSpeechAt = 0;
        updatePanel("Escutando silêncio", "Microfone ligado. Fale para o VAD detectar início de fala.");
      }
      return;
    }
    if (level >= config.releaseThreshold) { state.lastLoudAt = ts; updatePanel("Falando", `Volume atual: ${Math.round(level * 100)}%.`); return; }
    const quietMs = ts - state.lastLoudAt;
    updatePanel("Silêncio após fala", `Fechando trecho em ${Math.max(0, config.silenceToFinishMs - quietMs)}ms se continuar silêncio.`);
    if (quietMs >= config.silenceToFinishMs) finishSpeech(ts);
  }
  function bind() {
    if (window.__NOELLE_STREAM_VAD_V19833_BOUND__) return; window.__NOELLE_STREAM_VAD_V19833_BOUND__ = true;
    window.addEventListener("noelle-stream-audio-level-v19830", onAudioLevel);
    document.addEventListener("click", (event) => { const t = event.target; if (!(t instanceof HTMLElement)) return; if (t.id === "streamStopBtn") setTimeout(() => resetVad("Microfone desligado pelo botão."), 120); if (t.closest('[data-target="stream"]')) setTimeout(ensurePanel, 180); }, true);
    ensurePanel();
  }
  window.NoelleStreamVadV19831 = Object.freeze({ version: VERSION, bind, resetVad, getState: () => ({ ...state, config: { ...config } }) });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
})();
