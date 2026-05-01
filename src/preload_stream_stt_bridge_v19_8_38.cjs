// NOELLE_STREAM_STT_PRELOAD_V19_8_38_BEGIN
try {
  const electron = require("electron");
  const contextBridge = electron.contextBridge;
  const ipcRenderer = electron.ipcRenderer;

  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_STREAM_STT_PRELOAD_V19_8_38__) {
    globalThis.__NOELLE_STREAM_STT_PRELOAD_V19_8_38__ = true;

    contextBridge.exposeInMainWorld("noelleStreamBridgeV19838", {
      transcribeAudio: (audioBuffer, meta = {}) => ipcRenderer.invoke("noelle:stream-transcribe-audio-v19_8_38", audioBuffer, meta),
      sttStatus: () => ipcRenderer.invoke("noelle:stream-stt-status-v19_8_38")
    });
  }
} catch (err) {
  console.warn("[stream-stt-v19.8.38] preload bridge indisponível:", err && err.message ? err.message : err);
}
// NOELLE_STREAM_STT_PRELOAD_V19_8_38_END
