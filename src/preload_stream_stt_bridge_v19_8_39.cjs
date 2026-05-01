// NOELLE_STREAM_STT_PRELOAD_V19_8_39_BEGIN
try {
  const electron = require("electron");
  const contextBridge = electron.contextBridge;
  const ipcRenderer = electron.ipcRenderer;

  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_STREAM_STT_PRELOAD_V19_8_39__) {
    globalThis.__NOELLE_STREAM_STT_PRELOAD_V19_8_39__ = true;

    contextBridge.exposeInMainWorld("noelleStreamBridgeV19839", {
      transcribeAudio: (audioBuffer, meta = {}) => ipcRenderer.invoke("noelle:stream-transcribe-audio-v19_8_39", audioBuffer, meta),
      sttStatus: () => ipcRenderer.invoke("noelle:stream-stt-status-v19_8_39")
    });
  }
} catch (err) {
  console.warn("[stream-stt-v19.8.39] preload bridge indisponível:", err && err.message ? err.message : err);
}
// NOELLE_STREAM_STT_PRELOAD_V19_8_39_END
