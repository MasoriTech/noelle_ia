"use strict";
/* Noelle/Yoru V19.8.33 — Stream Segment Recorder Fix
 - grava trecho em memória entre VAD start/finish;
 - NÃO salva em disco, NÃO transcreve, NÃO envia para IA, NÃO gera voz.
*/
(() => {
  const VERSION = "19.8.33-stream-segment-recorder-fix-2026";
  const state = { stream: null, recorder: null, chunks: [], recording: false, lastBlob: null, lastBlobUrl: "", lastDurationMs: 0, lastSizeBytes: 0, startedAt: 0, segments: 0, lastError: "" };
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
  function chooseMimeType() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    if (!window.MediaRecorder) return "";
    return types.find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; } }) || "";
  }
  function formatBytes(bytes) { const n = Number(bytes || 0); if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1048576).toFixed(2)} MB`; }
  function ensurePanel() {
    if (qs("#streamSegmentPanelV19832")) return;
    const root = qs("#streamPageV19829 .stream-v19829-shell") || qs("#streamPageV19830c .stream-v19829-shell") || qs('.page[data-page="stream"] .stream-v19829-shell') || qs('.page[data-page="stream"]');
    if (!root) return;
    const card = document.createElement("section"); card.id = "streamSegmentPanelV19832"; card.className = "stream-v19829-card"; card.setAttribute("data-noelle-segment-v19-8-32", VERSION);
    card.innerHTML = `
      <h3>Trecho de áudio</h3>
      <p><strong id="streamSegmentStateV19832">Aguardando fala</strong></p>
      <p id="streamSegmentDetailV19832" class="muted">Quando o VAD detectar fala, o trecho será gravado em memória.</p>
      <p class="muted">Trechos: <strong id="streamSegmentCountV19832">0</strong> · Duração: <strong id="streamSegmentDurationV19832">0ms</strong> · Tamanho: <strong id="streamSegmentSizeV19832">0 B</strong></p>
      <audio id="streamSegmentAudioV19832" controls hidden></audio>
      <p class="muted">Fase 4: gravação local em memória. Transcrição vem depois.</p>`;
    const logCard = qs("#streamLog")?.closest?.("section");
    if (logCard?.parentElement === root) root.insertBefore(card, logCard); else root.appendChild(card);
  }
  function updatePanel(label, detail) {
    ensurePanel();
    const map = {
      "#streamSegmentStateV19832": label,
      "#streamSegmentDetailV19832": detail,
      "#streamSegmentCountV19832": String(state.segments),
      "#streamSegmentDurationV19832": `${Math.round(state.lastDurationMs)}ms`,
      "#streamSegmentSizeV19832": formatBytes(state.lastSizeBytes)
    };
    for (const [sel, value] of Object.entries(map)) { const el = qs(sel); if (el) el.textContent = value; }
    const audioEl = qs("#streamSegmentAudioV19832");
    if (audioEl) { audioEl.hidden = !state.lastBlobUrl; if (state.lastBlobUrl && audioEl.src !== state.lastBlobUrl) audioEl.src = state.lastBlobUrl; }
  }
  function cleanupLastBlobUrl() { if (state.lastBlobUrl) { try { URL.revokeObjectURL(state.lastBlobUrl); } catch (_) {} } state.lastBlobUrl = ""; }
  function setStream(stream) { state.stream = stream || null; updatePanel(state.stream ? "Microfone pronto" : "Aguardando microfone", state.stream ? "Aguardando o VAD detectar fala para gravar o trecho." : "Clique em Iniciar escuta para liberar o microfone."); if (state.stream) addLog("segmento", "Stream do microfone recebido pelo gravador de trechos."); }
  function startSegment(eventDetail = {}) {
    if (state.recording) return { ok: true, alreadyRecording: true };
    ensurePanel();
    if (!window.MediaRecorder) { state.lastError = "MediaRecorder indisponível."; updatePanel("Erro", state.lastError); addLog("segmento", state.lastError); return { ok: false, error: state.lastError }; }
    if (!state.stream) { const current = window.NoelleStreamAudioCaptureV19830?.getInternalStream?.(); if (current) state.stream = current; }
    if (!state.stream) { state.lastError = "Stream do microfone indisponível."; updatePanel("Sem stream", "Ligue o microfone antes de falar."); addLog("segmento", "Não foi possível iniciar gravação: stream indisponível."); return { ok: false, error: state.lastError }; }
    try {
      state.chunks = []; state.startedAt = Date.now(); cleanupLastBlobUrl();
      const mimeType = chooseMimeType(); const recorder = new MediaRecorder(state.stream, mimeType ? { mimeType } : undefined);
      state.recorder = recorder; state.recording = true;
      recorder.addEventListener("dataavailable", (event) => { if (event.data?.size > 0) state.chunks.push(event.data); });
      recorder.addEventListener("stop", finishBlob, { once: true }); recorder.start(120);
      setStatus("Gravando fala", "O trecho está sendo gravado em memória. Ainda não há transcrição.", "ready_to_answer"); updatePanel("Gravando", "Fala detectada. Gravando trecho em memória."); addLog("segmento", "Gravação do trecho iniciada.");
      window.dispatchEvent(new CustomEvent("noelle-stream-segment-recording-start-v19832", { detail: { version: VERSION, at: Date.now(), vad: eventDetail } }));
      return { ok: true };
    } catch (err) { state.recording = false; state.recorder = null; state.lastError = err?.message || String(err); updatePanel("Erro", state.lastError); addLog("segmento", "Falha ao iniciar gravação: " + state.lastError); return { ok: false, error: state.lastError }; }
  }
  function stopSegment(reason = "Trecho finalizado pelo VAD.") {
    if (!state.recording || !state.recorder) return { ok: true, idle: true };
    try { state.recording = false; if (state.recorder.state !== "inactive") state.recorder.stop(); updatePanel("Finalizando", "Fechando trecho de áudio em memória."); addLog("segmento", reason); return { ok: true }; }
    catch (err) { state.recording = false; state.lastError = err?.message || String(err); updatePanel("Erro", state.lastError); addLog("segmento", "Falha ao parar gravação: " + state.lastError); return { ok: false, error: state.lastError }; }
  }
  function finishBlob() {
    const duration = Math.max(0, Date.now() - state.startedAt); const mimeType = state.chunks[0]?.type || chooseMimeType() || "audio/webm"; const blob = new Blob(state.chunks, { type: mimeType });
    state.lastBlob = blob; state.lastDurationMs = duration; state.lastSizeBytes = blob.size; state.segments += 1; state.recorder = null; state.recording = false; state.chunks = []; state.lastBlobUrl = URL.createObjectURL(blob);
    setStatus("Trecho gravado", `Trecho em memória: ${Math.round(duration)}ms, ${formatBytes(blob.size)}.`, "waiting_trigger"); updatePanel("Trecho pronto", "Áudio guardado em memória para a próxima fase."); addLog("segmento", `Trecho gravado em memória: ${Math.round(duration)}ms, ${formatBytes(blob.size)}.`);
    window.dispatchEvent(new CustomEvent("noelle-stream-segment-ready-v19832", { detail: { version: VERSION, blob, blobUrl: state.lastBlobUrl, durationMs: duration, sizeBytes: blob.size, mimeType: blob.type } }));
  }
  function clearSegment() { if (state.recording) stopSegment("Trecho cancelado por limpeza."); cleanupLastBlobUrl(); state.lastBlob = null; state.lastDurationMs = 0; state.lastSizeBytes = 0; state.chunks = []; updatePanel("Limpo", "Nenhum trecho de áudio em memória."); }
  function bind() {
    if (window.__NOELLE_STREAM_SEGMENT_RECORDER_V19833_BOUND__) return; window.__NOELLE_STREAM_SEGMENT_RECORDER_V19833_BOUND__ = true;
    window.addEventListener("noelle-stream-mic-start-v19832", (event) => setStream(event.detail?.stream || null));
    window.addEventListener("noelle-stream-mic-stop-v19832", () => { stopSegment("Microfone desligado; trecho atual cancelado."); setStream(null); });
    window.addEventListener("noelle-stream-vad-start-v19831", (event) => startSegment(event.detail || {}));
    window.addEventListener("noelle-stream-vad-finish-v19831", () => stopSegment("VAD finalizou o trecho."));
    window.addEventListener("noelle-stream-vad-cancel-v19831", () => stopSegment("VAD cancelou o trecho."));
    document.addEventListener("click", (event) => { const t = event.target; if (!(t instanceof HTMLElement)) return; if (t.id === "streamClearBtn") setTimeout(clearSegment, 80); if (t.id === "streamStopBtn") setTimeout(() => stopSegment("Microfone parado pelo botão."), 80); if (t.closest('[data-target="stream"]')) setTimeout(ensurePanel, 180); }, true);
    ensurePanel();
  }
  window.NoelleStreamSegmentRecorderV19832 = Object.freeze({ version: VERSION, bind, startSegment, stopSegment, clearSegment, getState: () => ({ recording: state.recording, hasSegment: !!state.lastBlob, lastDurationMs: state.lastDurationMs, lastSizeBytes: state.lastSizeBytes, segments: state.segments, lastError: state.lastError }) });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
})();
