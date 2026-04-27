import { safeLayout } from "./room_layout_store.js";

const KEY = "noelle_room_autosave_v18_4";

export function saveRoomAutosave(layout) {
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      layout: safeLayout(layout)
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export function loadRoomAutosave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ok: false, reason: "empty" };
    const payload = JSON.parse(raw);
    return { ok: true, savedAt: payload.savedAt, layout: safeLayout(payload.layout) };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export function clearRoomAutosave() {
  try {
    localStorage.removeItem(KEY);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export function createAutosaveScheduler({ getLayout, onStatus, intervalMs = 1200 }) {
  let timer = null;
  let lastHash = "";

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const layout = safeLayout(getLayout());
      const hash = JSON.stringify(layout);
      if (hash === lastHash) return;
      lastHash = hash;
      const result = saveRoomAutosave(layout);
      if (result.ok) onStatus?.(`Autosave: ${new Date(result.payload.savedAt).toLocaleTimeString()}`);
      else onStatus?.("Autosave falhou");
    }, intervalMs);
  }

  function flush() {
    clearTimeout(timer);
    const layout = safeLayout(getLayout());
    lastHash = JSON.stringify(layout);
    return saveRoomAutosave(layout);
  }

  function destroy() {
    clearTimeout(timer);
  }

  return { schedule, flush, destroy };
}
