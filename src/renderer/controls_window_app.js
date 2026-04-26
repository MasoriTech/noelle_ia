import {
  CAMERA_PRESETS,
  AVATAR_CONFIG,
  DEFAULT_AVATAR_TUNING,
  saveAvatarTuning,
  loadAvatarTuning,
  DEFAULT_UI_PREFS,
  saveUiPrefs,
  loadUiPrefs,
} from "./config.js";
import { loadMotionManifest } from "./motions.js";
import { loadItemManifest, buildContextActions, slotLabel } from "./items.js";
import { buildMotionCarousel, buildInventoryGrid, openItemMenu, closeItemMenu, updateEquippedSummary } from "./ui.js";

function byId(id) { return document.getElementById(id); }
function bind(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener("click", handler);
}

function setPresetIoStatus(text) {
  const el = byId("presetIoStatus");
  if (el) el.textContent = text;
}
function setDiagnosticStatus(text) {
  const el = byId("diagnosticStatus");
  if (el) el.textContent = text;
}

async function importAvatarAgainFromControls() {
  try {
    const result = await window.desktopWidget?.importAvatarVrmNative?.();
    if (result?.ok) {
      setPresetIoStatus("VRM importado novamente. A janela do avatar foi recarregada.");
      window.desktopWidget?.reloadAvatarWindow?.();
      window.desktopWidget?.showAvatar?.();
      return;
    }
    if (result?.canceled) {
      setPresetIoStatus("Importação do VRM cancelada.");
      return;
    }
    setPresetIoStatus("Falha ao importar VRM: " + (result?.error || "erro desconhecido"));
  } catch (err) {
    setPresetIoStatus("Falha ao importar VRM: " + err);
  }
}

const controlManager = {
  equipped: {},
  itemLabels: new Map(),

  setKnownItems(items = []) {
    this.itemLabels = new Map(items.map((item) => [item.id, item.label || item.id]));
    this.syncFromStorage();
  },

  _readRawState() {
    try {
      return JSON.parse(localStorage.getItem("noelle_equipped_items") || "{}") || {};
    } catch {
      return {};
    }
  },

  _writeRawState(state) {
    localStorage.setItem("noelle_equipped_items", JSON.stringify(state || {}));
    this.syncFromStorage();
  },

  syncFromStorage() {
    const parsed = this._readRawState();
    const equipped = {};
    for (const [slot, entry] of Object.entries(parsed || {})) {
      if (entry?.id) {
        equipped[slot] = {
          item: {
            id: entry.id,
            label: this.itemLabels.get(entry.id) || entry.label || entry.id
          },
          slot
        };
      }
    }
    this.equipped = equipped;
  },

  isEquipped(itemId) {
    return !!this.getEquippedSlot(itemId);
  },

  getEquippedSlot(itemId) {
    this.syncFromStorage();
    for (const [slot, entry] of Object.entries(this.equipped)) {
      if (entry?.item?.id === itemId) return slot;
    }
    return null;
  },

  equip(item, slot) {
    const state = this._readRawState();

    // Um item só pode ficar em um lugar.
    for (const [currentSlot, entry] of Object.entries(state)) {
      if (entry?.id === item.id) delete state[currentSlot];
    }

    // Modo duas mãos ocupa as duas mãos e remove conflitos.
    if (slot === "two_hands") {
      delete state.right_hand;
      delete state.left_hand;
      delete state.two_hands;
    }

    // Um item de mão remove o item de duas mãos.
    if (slot === "right_hand" || slot === "left_hand") {
      delete state.two_hands;
    }

    // Um slot só pode ter um item.
    state[slot] = { id: item.id, label: item.label || item.id, slot };
    this._writeRawState(state);
  },

  unequip(itemId) {
    const state = this._readRawState();
    for (const [slot, entry] of Object.entries(state)) {
      if (entry?.id === itemId) delete state[slot];
    }
    this._writeRawState(state);
  },

  clearAll() {
    this._writeRawState({});
  },

  slotLabel
};

let cachedWindowState = null;
let cachedDesktopEnv = null;

function getCurrentPresetSnapshot() {
  const tuning = loadAvatarTuning();
  const uiPrefs = loadUiPrefs();
  return {
    version: 2,
    type: "noelle_avatar_preset",
    savedAt: new Date().toISOString(),
    ui: {
      preset: localStorage.getItem("noelle_preset") || "full",
      scale: Number(localStorage.getItem("noelle_scale") || tuning.defaultScale || AVATAR_CONFIG.defaultScale),
      lastMotionId: localStorage.getItem("noelle_last_motion") || "VRMA_02",
      uiPrefs,
    },
    avatarTuning: { ...DEFAULT_AVATAR_TUNING, ...tuning },
    equippedItems: (() => {
      try { return JSON.parse(localStorage.getItem("noelle_equipped_items") || "{}"); }
      catch { return {}; }
    })()
  };
}

function applyPresetSnapshot(snapshot) {
  if (!snapshot || snapshot.type !== "noelle_avatar_preset") {
    throw new Error("Arquivo de preset inválido.");
  }

  const presetName = snapshot.ui?.preset && CAMERA_PRESETS[snapshot.ui.preset] ? snapshot.ui.preset : "full";
  const scale = Number(snapshot.ui?.scale);
  const lastMotionId = snapshot.ui?.lastMotionId || "VRMA_02";

  localStorage.setItem("noelle_preset", presetName);
  if (!Number.isNaN(scale)) localStorage.setItem("noelle_scale", String(scale));
  localStorage.setItem("noelle_last_motion", lastMotionId);

  const tuning = saveAvatarTuning(snapshot.avatarTuning || DEFAULT_AVATAR_TUNING);
  const uiPrefs = saveUiPrefs(snapshot.ui?.uiPrefs || DEFAULT_UI_PREFS);
  localStorage.setItem("noelle_equipped_items", JSON.stringify(snapshot.equippedItems || {}));

  return {
    presetName,
    scale: Number(localStorage.getItem("noelle_scale")),
    lastMotionId,
    tuning,
    uiPrefs,
  };
}

function updateSummaries() {
  controlManager.syncFromStorage();
  updateEquippedSummary(controlManager);
  const lastMotion = localStorage.getItem("noelle_last_motion") || "VRMA_02";
  const motionSummary = byId("motionSummary");
  if (motionSummary) motionSummary.textContent = "Último emote: " + lastMotion;
}

function updateWindowSummary(payload) {
  if (payload) cachedWindowState = payload;
  const el = byId("windowSummary");
  if (!el) return;
  const top = cachedWindowState?.avatarAlwaysOnTop ? "topo ligado" : "topo desligado";
  const click = cachedWindowState?.avatarClickThrough ? "clique atravessável ligado" : "clique normal";
  el.textContent = `Avatar separado • ${top} • ${click}`;

  const spawnInfo = byId("spawnInfo");
  if (spawnInfo) {
    const tuning = loadAvatarTuning();
    spawnInfo.textContent = `spawnX ${tuning.spawnX.toFixed(2)} • spawnY ${tuning.spawnY.toFixed(2)} • escala ${Number(localStorage.getItem("noelle_scale") || tuning.defaultScale).toFixed(2)}`;
  }
}

function setSizeButtonState(activeSize) {
  ["sizeSmallBtn","sizeMediumBtn","sizeLargeBtn"].forEach((id) => {
    const el = byId(id);
    if (el) el.classList.toggle("active", id === activeSize);
  });
}

function presetButtonState(activePreset) {
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === activePreset);
  });
  localStorage.setItem("noelle_preset", activePreset);
}

function setupTabs() {
  const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  const buttons = Array.from(document.querySelectorAll("[data-tab-target]"));

  function activate(tab) {
    panels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === tab;
      panel.classList.toggle("active", isActive);
      if (isActive && tab === "chat") {
        panel.scrollTop = 0;
        requestAnimationFrame(() => {
          const log = document.getElementById("coreChatLog");
          if (log) log.scrollTop = log.scrollHeight;
        });
      }
    });
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tabTarget === tab);
    });
    localStorage.setItem("noelle_controls_tab", tab);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.dataset.tabTarget));
  });

  activate(localStorage.getItem("noelle_controls_tab") || "home");
}

function syncTuningControls() {
  const tuning = loadAvatarTuning();
  const scaleValue = Number(localStorage.getItem("noelle_scale") || tuning.defaultScale || AVATAR_CONFIG.defaultScale);

  const mapping = {
    spawnXRange: tuning.spawnX,
    spawnYRange: tuning.spawnY,
    defaultScaleRange: scaleValue,
    frameOffsetXRange: tuning.frameOffsetX,
    frameOffsetYRange: tuning.frameOffsetY,
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const el = byId(id);
    if (el) el.value = String(value);
  });

  const values = {
    spawnXValue: tuning.spawnX,
    spawnYValue: tuning.spawnY,
    defaultScaleValue: scaleValue,
    frameOffsetXValue: tuning.frameOffsetX,
    frameOffsetYValue: tuning.frameOffsetY,
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = byId(id);
    if (el) el.textContent = Number(value).toFixed(2);
  });

  updateWindowSummary(cachedWindowState);
}





function syncUiPrefControls() {
  const prefs = loadUiPrefs();
  const themeSelect = byId("themeSelect");
  const performanceModeSelect = byId("performanceModeSelect");
  const reducedTransparencyToggle = byId("reducedTransparencyToggle");
  const expressionOverlayToggle = byId("expressionOverlayToggle");
  const autoCenterOnPresetToggle = byId("autoCenterOnPresetToggle");

  if (themeSelect) themeSelect.value = prefs.theme;
  if (performanceModeSelect) performanceModeSelect.value = prefs.performanceMode;
  if (reducedTransparencyToggle) reducedTransparencyToggle.checked = !!prefs.reducedTransparency;
  if (expressionOverlayToggle) expressionOverlayToggle.checked = !!prefs.expressionOverlay;
  if (autoCenterOnPresetToggle) autoCenterOnPresetToggle.checked = !!prefs.autoCenterOnPreset;

  const themeValue = byId("themeValue");
  const performanceModeValue = byId("performanceModeValue");
  if (themeValue) themeValue.textContent = prefs.theme;
  if (performanceModeValue) performanceModeValue.textContent = prefs.performanceMode;

  document.body.classList.toggle("theme-light", prefs.theme === "light");
  document.body.classList.toggle("theme-dark", prefs.theme === "dark");
  document.body.classList.toggle("theme-noelle-classic", prefs.theme === "noelle_classic");
  document.body.classList.toggle("theme-noelle", prefs.theme === "noelle" || prefs.theme === "system");
  document.body.classList.toggle("reduced-transparency", !!prefs.reducedTransparency);

  ["themeNoelleBtn", "themeNoelleClassicBtn", "themeDarkBtn", "themeLightBtn", "themeSystemBtn"].forEach((id) => {
    const btn = byId(id);
    if (!btn) return;
    const value = btn.dataset.themeValue;
    btn.classList.toggle("active", value === prefs.theme || (prefs.theme === "system" && value === "system"));
  });
}


function setThemePreset(theme) {
  const themeSelect = byId("themeSelect");
  if (themeSelect) themeSelect.value = theme;
  const current = loadUiPrefs();
  const saved = saveUiPrefs({ ...current, theme });
  syncUiPrefControls();
  const nativeTheme = saved.theme === "light" ? "light" : saved.theme === "system" ? "system" : "dark";
  window.desktopWidget?.setThemeSourceNative?.(nativeTheme);
  window.desktopWidget?.sendAvatarCommand({
    type: "updateUiPrefs",
    uiPrefs: saved
  });
  setPresetIoStatus(`Tema aplicado: ${theme === "noelle" ? "Noelle" : theme}`);
}


function applyUiPrefsFromControls() {
  const nextPrefs = {
    theme: byId("themeSelect")?.value || "system",
    performanceMode: byId("performanceModeSelect")?.value || "balanced",
    reducedTransparency: !!byId("reducedTransparencyToggle")?.checked,
    expressionOverlay: !!byId("expressionOverlayToggle")?.checked,
    autoCenterOnPreset: !!byId("autoCenterOnPresetToggle")?.checked,
  };

  const saved = saveUiPrefs(nextPrefs);
  syncUiPrefControls();

  const nativeTheme = saved.theme === "light" ? "light" : saved.theme === "system" ? "system" : "dark";
  window.desktopWidget?.setThemeSourceNative?.(nativeTheme);
  window.desktopWidget?.sendAvatarCommand({
    type: "updateUiPrefs",
    uiPrefs: saved
  });

  setPresetIoStatus("Preferências aplicadas.");
}

function applyTuningFromControls({ live = true } = {}) {
  const current = loadAvatarTuning();
  const next = {
    ...current,
    spawnX: Number(byId("spawnXRange")?.value ?? current.spawnX),
    spawnY: Number(byId("spawnYRange")?.value ?? current.spawnY),
    defaultScale: Number(byId("defaultScaleRange")?.value ?? current.defaultScale),
    frameOffsetX: Number(byId("frameOffsetXRange")?.value ?? current.frameOffsetX),
    frameOffsetY: Number(byId("frameOffsetYRange")?.value ?? current.frameOffsetY),
  };

  saveAvatarTuning(next);
  localStorage.setItem("noelle_scale", String(next.defaultScale));
  syncTuningControls();

  if (live) {
    window.desktopWidget?.sendAvatarCommand({
      type: "updateAvatarTuning",
      tuning: next,
      syncScale: true
    });
  }
}

function nudgeTuning(partial) {
  const current = loadAvatarTuning();
  const next = {
    ...current,
    ...partial,
  };
  saveAvatarTuning(next);
  if (partial.defaultScale !== undefined) {
    localStorage.setItem("noelle_scale", String(next.defaultScale));
  }
  syncTuningControls();
  window.desktopWidget?.sendAvatarCommand({ type: "updateAvatarTuning", tuning: next, syncScale: true });
}

function resetTuning() {
  saveAvatarTuning(DEFAULT_AVATAR_TUNING);
  localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
  syncTuningControls();
  window.desktopWidget?.sendAvatarCommand({
    type: "resetAvatarTuning"
  });
}

async function savePresetWithFallback(snapshot) {
  const text = JSON.stringify(snapshot, null, 2);
  const defaultPath = `noelle_preset_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  try {
    const nativeResult = await window.desktopWidget?.saveTextFileNative?.({ text, defaultPath });
    if (nativeResult && !nativeResult.canceled && !nativeResult.error) {
      return { ok: true, mode: "native", path: nativeResult.filePath };
    }
  } catch {}

  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultPath;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, mode: "fallback" };
}

async function openPresetWithFallback() {
  try {
    const nativeResult = await window.desktopWidget?.openTextFileNative?.();
    if (nativeResult && !nativeResult.canceled && !nativeResult.error && nativeResult.text) {
      return { ok: true, mode: "native", text: nativeResult.text };
    }
  } catch {}

  return new Promise((resolve) => {
    const input = byId("presetFileInput");
    if (!input) {
      resolve({ ok: false, error: "input file não encontrado" });
      return;
    }
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        resolve({ ok: false, error: "nenhum arquivo selecionado" });
        return;
      }
      try {
        const text = await file.text();
        resolve({ ok: true, mode: "fallback", text });
      } catch (err) {
        resolve({ ok: false, error: String(err) });
      } finally {
        event.target.value = "";
      }
    };
    input.click();
  });
}

async function initDesktopEnvironment() {
  try {
    cachedDesktopEnv = await window.desktopWidget?.getDesktopEnvironment?.();
  } catch {
    cachedDesktopEnv = null;
  }
  const prefs = loadUiPrefs();
  if (prefs.theme === "system" && cachedDesktopEnv) {
    document.body.classList.toggle("theme-light", !cachedDesktopEnv.shouldUseDarkColors);
  } else {
    document.body.classList.toggle("theme-light", prefs.theme === "light");
  }
}

function buildDiagnosticReport() {
  const tuning = loadAvatarTuning();
  const uiPrefs = loadUiPrefs();
  const report = {
    time: new Date().toISOString(),
    windowState: cachedWindowState,
    desktopEnv: cachedDesktopEnv,
    avatarTuning: tuning,
    uiPrefs,
    preset: localStorage.getItem("noelle_preset") || "full",
    scale: Number(localStorage.getItem("noelle_scale") || tuning.defaultScale),
    lastMotionId: localStorage.getItem("noelle_last_motion") || "VRMA_02",
    equippedItems: (() => {
      try { return JSON.parse(localStorage.getItem("noelle_equipped_items") || "{}"); }
      catch { return {}; }
    })(),
  };
  return JSON.stringify(report, null, 2);
}

async function copyDiagnostic() {
  try {
    await navigator.clipboard.writeText(buildDiagnosticReport());
    setDiagnosticStatus("Diagnóstico copiado.");
  } catch (err) {
    setDiagnosticStatus("Falha ao copiar diagnóstico: " + err);
  }
}


const NOELLE_CORE_SESSION_ID = "noelle_chat";
const NOELLE_CORE_HISTORY_KEY = "noelle_core_chat_history_v1";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readNoelleCoreHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOELLE_CORE_HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(-30) : [];
  } catch {
    return [];
  }
}

function writeNoelleCoreHistory(items) {
  localStorage.setItem(NOELLE_CORE_HISTORY_KEY, JSON.stringify((items || []).slice(-30)));
}

function pushNoelleCoreMessage(role, content, meta = {}) {
  const items = readNoelleCoreHistory();
  items.push({
    role,
    content: String(content || ""),
    meta,
    at: new Date().toISOString()
  });
  writeNoelleCoreHistory(items);
  renderNoelleCoreChat();
}

function renderNoelleCoreChat() {
  const logEl = byId("coreChatLog");
  if (!logEl) return;

  const items = readNoelleCoreHistory();
  if (!items.length) {
    logEl.innerHTML = `
      <div class="chat-bubble system">
        Noelle pronta para conversar. Primeiro teste: “oi” ou “qual ano estamos”.
      </div>
    `;
    return;
  }

  logEl.innerHTML = items.map((item) => {
    const role = item.role === "user" ? "user" : item.role === "assistant" ? "assistant" : "system";
    const who = role === "user" ? "Você" : role === "assistant" ? "Noelle" : "Sistema";
    const meta = role === "assistant" && item.meta?.seconds ? " · " + escapeHtml(String(item.meta.seconds) + "s") : "";
    return '<div class="chat-bubble ' + role + '"><b>' + who + meta + '</b><br>' + escapeHtml(item.content) + '</div>';
  }).join("");
  logEl.scrollTop = logEl.scrollHeight;
}

function setNoelleCoreRuntimeLine(message, tone = "normal") {
  const el = byId("coreRuntimeLine");
  if (!el) return;
  el.textContent = message || "Pronto.";
  el.dataset.tone = tone;
}

function formatNoelleCoreMetrics(metrics = {}) {
  const parts = [];
  if (metrics.eval_count) parts.push(String(metrics.eval_count) + " tokens");
  if (metrics.tokens_per_second) parts.push(String(metrics.tokens_per_second) + " tokens/s");
  if (metrics.load_duration) parts.push("load " + (metrics.load_duration / 1e9).toFixed(2) + "s");
  return parts.join(" · ");
}

function formatNoelleCoreDiagnostic(status = {}) {
  if (!status.ok) return "Diagnóstico falhou: " + (status.error || "erro desconhecido");
  const lines = [
    "Ollama: " + (status.ollamaOnline ? "online" : "offline"),
    "Modelo ativo: " + status.activeModel,
    "Modelo instalado: " + (status.activeModelInstalled ? "sim" : "não"),
    "Modelo carregado: " + (status.activeModelLoaded ? "sim" : "não"),
    "Perfil: " + status.activeProfile,
    "Persona: " + (status.activePersonaLabel || status.activePersona || "nobre"),
    "Thinking: " + (status.think ? "ON" : "OFF"),
    "Modelos instalados: " + (status.installedCount ?? 0),
    "Modelos carregados: " + (status.loadedCount ?? 0)
  ];
  if (Array.isArray(status.recommendations) && status.recommendations.length) {
    lines.push("Recomendações:");
    status.recommendations.slice(0, 5).forEach((item) => lines.push("- " + item));
  }
  if (status.lastChatSeconds) lines.push("Última resposta: " + status.lastChatSeconds + "s");
  return lines.join("\n");
}

function setNoelleCoreStatusLine(status) {
  const el = byId("coreStatusLine");
  if (!el) return;

  if (!status) {
    el.innerHTML = `<span class="core-chip">NoelleCore aguardando</span>`;
    return;
  }

  if (!status.ok) {
    el.innerHTML = `<span class="core-chip">IA com erro · ${escapeHtml(status.error || "ver diagnóstico")}</span>`;
    return;
  }

  const online = status.ollamaOnline ? "online" : "offline";
  const profile = status.activeProfile || "rapido";
  const loaded = status.activeModelLoaded ? " · RAM" : "";
  const missing = status.activeModelInstalled === false ? " · instalar modelo" : "";
  const compact = status.ollamaOnline
    ? `IA ${online} · ${profile}${loaded}${missing}`
    : "IA offline · abrir Ollama";
  el.innerHTML = `<span class="core-chip">${escapeHtml(compact)}</span>`;
}

function setNoelleCoreBusy(isBusy, label = "Enviar") {
  const btn = byId("coreSendBtn");
  const mic = byId("coreMicBtn");
  const input = byId("coreChatInput");
  if (btn) {
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? "Pensando..." : label;
  }
  if (mic) mic.disabled = !!isBusy;
  if (input) input.disabled = !!isBusy;
  if (isBusy) setNoelleCoreRuntimeLine("Noelle está pensando...", "busy");
}

let noelleCoreAudioStream = null;
let noelleCoreMediaRecorder = null;
let noelleCoreAudioChunks = [];
let noelleCoreAudioTimer = null;
let noelleCoreAudioStartedAt = 0;
let noelleCoreAudioBusy = false;

const NOELLE_AUDIO_RECORD_MS = 10000;
const NOELLE_AUDIO_MIN_BYTES = 900;
const NOELLE_AUDIO_STT_MODEL = "medium";
const NOELLE_AUDIO_STT_COMPUTE = "int8";
const NOELLE_AUDIO_STT_LANGUAGE = "pt";

const NOELLE_STT_CONFIG_STORAGE_KEY = "noelle_core_stt_config_v1";
function getSelectValue(id, fallback) {
  const el = byId(id);
  const value = el && typeof el.value === "string" ? el.value.trim() : "";
  return value || fallback;
}
function getNoelleAudioSttConfig() {
  const model = getSelectValue("coreSttModelSelect", NOELLE_AUDIO_STT_MODEL);
  const computeType = getSelectValue("coreSttComputeSelect", NOELLE_AUDIO_STT_COMPUTE);
  const rawLanguage = getSelectValue("coreSttLanguageSelect", NOELLE_AUDIO_STT_LANGUAGE);
  const language = rawLanguage === "auto" ? "" : rawLanguage;
  const seconds = Math.max(4, Math.min(15, Number(getSelectValue("coreSttRecordSecondsSelect", "8")) || 8));
  return { model, computeType, language, languageLabel: rawLanguage === "auto" ? "auto" : rawLanguage, recordMs: seconds * 1000, recordSeconds: seconds };
}
function saveNoelleSttConfig() {
  try {
    const config = getNoelleAudioSttConfig();
    localStorage.setItem(NOELLE_STT_CONFIG_STORAGE_KEY, JSON.stringify({ model: config.model, computeType: config.computeType, language: config.languageLabel, recordSeconds: config.recordSeconds }));
  } catch (_) {}
}
function restoreNoelleSttConfig() {
  try {
    const raw = localStorage.getItem(NOELLE_STT_CONFIG_STORAGE_KEY);
    if (!raw) return;
    const config = JSON.parse(raw);
    const map = { coreSttModelSelect: config.model, coreSttComputeSelect: config.computeType, coreSttLanguageSelect: config.language, coreSttRecordSecondsSelect: String(config.recordSeconds || "") };
    Object.entries(map).forEach(([id, value]) => {
      const el = byId(id);
      if (el && value) el.value = value;
    });
  } catch (_) {}
}
function setupNoelleCoreInternalTabs() {
  const root = document.querySelector(".core-ai-tabs");
  const buttons = Array.from(document.querySelectorAll("[data-core-ai-subtab]"));
  const panels = Array.from(document.querySelectorAll("[data-core-ai-panel]"));
  if (!root || !buttons.length || !panels.length) return;

  function setCollapsed(collapsed) {
    root.classList.toggle("collapsed", !!collapsed);
    try { localStorage.setItem("noelle_core_ai_tabs_collapsed", collapsed ? "1" : "0"); } catch (_) {}
  }

  function activate(name, options = {}) {
    const safeName = ["texto", "audio", "ollama"].includes(name) ? name : "texto";
    buttons.forEach((button) => {
      const active = button.dataset.coreAiSubtab === safeName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.title = active ? "Clique de novo para recolher" : "Abrir " + button.textContent.trim();
    });
    panels.forEach((panel) => {
      const active = panel.dataset.coreAiPanel === safeName;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    if (options.open) setCollapsed(false);
    try { localStorage.setItem("noelle_core_ai_subtab", safeName); } catch (_) {}
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.coreAiSubtab || "texto";
      const isActive = button.classList.contains("active");
      const isCollapsed = root.classList.contains("collapsed");
      if (isActive && !isCollapsed) {
        setCollapsed(true);
        return;
      }
      activate(name, { open: true });
    });
  });

  let initial = "texto";
  let collapsed = true;
  try {
    initial = localStorage.getItem("noelle_core_ai_subtab") || "texto";
    collapsed = localStorage.getItem("noelle_core_ai_tabs_collapsed") !== "0";
  } catch (_) {}
  activate(initial);
  setCollapsed(collapsed);
}

function clearNoelleAudioTimer() {
  if (noelleCoreAudioTimer) {
    clearTimeout(noelleCoreAudioTimer);
    noelleCoreAudioTimer = null;
  }
}

function setNoelleMicState(state = "idle", label = null) {
  const mic = byId("coreMicBtn");
  if (!mic) return;
  mic.dataset.state = state;
  if (label) mic.textContent = label;
  if (state === "listening") {
    mic.title = "Parar gravação";
    mic.setAttribute("aria-label", "Parar gravação");
  } else if (state === "checking") {
    mic.title = "Preparando microfone";
    mic.setAttribute("aria-label", "Preparando microfone");
  } else if (state === "transcribing") {
    mic.title = "Transcrevendo áudio";
    mic.setAttribute("aria-label", "Transcrevendo áudio");
  } else if (state === "blocked") {
    mic.title = "Microfone indisponível";
    mic.setAttribute("aria-label", "Microfone indisponível");
  } else {
    mic.title = "Falar para preencher o texto";
    mic.setAttribute("aria-label", "Falar para preencher o texto");
  }
}

function appendNoelleVoiceText(transcript) {
  const clean = String(transcript || "").trim();
  const input = byId("coreChatInput");
  if (!clean || !input) return;
  const current = String(input.value || "").trim();
  input.value = current ? current + " " + clean : clean;
  input.focus();
  try {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_) {}
}

function getNoelleAudioMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ];
  if (!window.MediaRecorder) return "";
  return candidates.find((type) => {
    try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; }
  }) || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler áudio."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve(dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl);
    };
    reader.readAsDataURL(blob);
  });
}

function cleanupNoelleAudioStream() {
  if (noelleCoreAudioStream) {
    try { noelleCoreAudioStream.getTracks().forEach((track) => track.stop()); } catch (_) {}
  }
  noelleCoreAudioStream = null;
}

async function transcribeNoelleAudioBlob(blob, mimeType) {
  if (!blob || blob.size < NOELLE_AUDIO_MIN_BYTES) {
    setNoelleCoreRuntimeLine("Áudio muito curto. Segure o mic e fale por 2 ou 3 segundos.", "normal");
    return;
  }
  if (!window.desktopWidget?.noelleCoreTranscribeAudio) {
    setNoelleCoreRuntimeLine("Transcrição local ainda não está ligada no preload.", "error");
    return;
  }

  const sttConfig = getNoelleAudioSttConfig();
  noelleCoreAudioBusy = true;
  setNoelleMicState("transcribing", "…");
  setNoelleCoreRuntimeLine("Transcrevendo com faster-whisper " + sttConfig.model + "...", "busy");

  try {
    const audioBase64 = await blobToBase64(blob);
    const result = await window.desktopWidget.noelleCoreTranscribeAudio({
      audioBase64,
      mimeType: mimeType || blob.type || "audio/webm",
      model: sttConfig.model,
      computeType: sttConfig.computeType,
      language: sttConfig.language
    });

    if (result?.ok && String(result.text || "").trim()) {
      appendNoelleVoiceText(result.text);
      const seconds = result.seconds ? " em " + result.seconds + "s" : "";
      setNoelleCoreRuntimeLine("Voz convertida em texto" + seconds + ". Revise e toque em Enviar.", "ok");
      return;
    }

    const reason = result?.error || "Não consegui transcrever voz clara.";
    setNoelleCoreRuntimeLine(reason, "error");
    if (result?.hint) pushNoelleCoreMessage("system", result.hint);
  } catch (err) {
    setNoelleCoreRuntimeLine("Falha ao transcrever: " + String(err?.message || err), "error");
  } finally {
    noelleCoreAudioBusy = false;
    setNoelleMicState("ready", "🎙");
  }
}

function stopNoelleCoreVoiceInput() {
  clearNoelleAudioTimer();
  const recorder = noelleCoreMediaRecorder;
  if (recorder && recorder.state !== "inactive") {
    try { recorder.stop(); } catch (_) {}
  } else {
    cleanupNoelleAudioStream();
    setNoelleMicState("ready", "🎙");
  }
}

async function startNoelleCoreVoiceInput() {
  const mic = byId("coreMicBtn");
  if (!mic || mic.disabled || noelleCoreAudioBusy) return;

  if (noelleCoreMediaRecorder && noelleCoreMediaRecorder.state === "recording") {
    setNoelleCoreRuntimeLine("Finalizando gravação...", "busy");
    stopNoelleCoreVoiceInput();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setNoelleMicState("blocked", "🎙");
    setNoelleCoreRuntimeLine("Gravação de áudio indisponível neste Electron.", "error");
    pushNoelleCoreMessage("system", "Não consegui acessar MediaRecorder/getUserMedia. O chat de texto continua funcionando normalmente.");
    return;
  }

  setNoelleMicState("checking", "…");
  setNoelleCoreRuntimeLine("Preparando microfone local...", "busy");

  try {
    noelleCoreAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    noelleCoreAudioChunks = [];
    const mimeType = getNoelleAudioMimeType();
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(noelleCoreAudioStream, options);
    noelleCoreMediaRecorder = recorder;
    noelleCoreAudioStartedAt = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) noelleCoreAudioChunks.push(event.data);
    };

    recorder.onerror = (event) => {
      clearNoelleAudioTimer();
      cleanupNoelleAudioStream();
      noelleCoreMediaRecorder = null;
      setNoelleMicState("blocked", "🎙");
      const reason = event?.error?.message || "erro no gravador de áudio";
      setNoelleCoreRuntimeLine("Erro no microfone: " + reason, "error");
    };

    recorder.onstop = async () => {
      clearNoelleAudioTimer();
      const elapsed = Date.now() - noelleCoreAudioStartedAt;
      const chunks = noelleCoreAudioChunks.slice();
      const finalMime = recorder.mimeType || mimeType || "audio/webm";
      noelleCoreMediaRecorder = null;
      noelleCoreAudioChunks = [];
      cleanupNoelleAudioStream();

      if (elapsed < 700) {
        setNoelleMicState("ready", "🎙");
        setNoelleCoreRuntimeLine("Gravação curta demais. Fale por alguns segundos.", "normal");
        return;
      }

      const blob = new Blob(chunks, { type: finalMime });
      await transcribeNoelleAudioBlob(blob, finalMime);
    };

    const sttConfig = getNoelleAudioSttConfig();
    recorder.start(1000);
    setNoelleMicState("listening", "■");
    setNoelleCoreRuntimeLine("Gravando por até " + sttConfig.recordSeconds + "s... clique no mic para parar.", "busy");
    noelleCoreAudioTimer = setTimeout(() => stopNoelleCoreVoiceInput(), sttConfig.recordMs || NOELLE_AUDIO_RECORD_MS);
  } catch (err) {
    clearNoelleAudioTimer();
    cleanupNoelleAudioStream();
    noelleCoreMediaRecorder = null;
    setNoelleMicState("blocked", "🎙");
    const reason = String(err?.message || err || "permissão negada");
    setNoelleCoreRuntimeLine("Microfone não autorizado. Texto continua normal.", "error");
    pushNoelleCoreMessage("system", "Não consegui usar o microfone: " + reason + "\nO chat de texto continua funcionando normalmente.");
  }
}


async function refreshNoelleCoreStatus() {
  const status = await window.desktopWidget?.noelleCoreStatus?.();
  setNoelleCoreStatusLine(status);
  const modelSelect = byId("coreModelSelect");
  const profileSelect = byId("coreProfileSelect");
  const personaSelect = byId("corePersonaSelect");
  if (status?.activeMode && modelSelect) modelSelect.value = status.activeMode;
  if (status?.activeProfile && profileSelect) profileSelect.value = status.activeProfile;
  if (status?.activePersona && personaSelect) personaSelect.value = status.activePersona;
  return status;
}

async function sendNoelleCoreMessage(customText = null, meta = {}) {
  const input = byId("coreChatInput");
  const text = String(customText ?? input?.value ?? "").trim();
  if (!text) return;

  if (!customText && input) input.value = "";
  pushNoelleCoreMessage("user", text);
  setNoelleCoreBusy(true);

  try {
    const lowerText = text.toLowerCase();
    if (lowerText === "/ajuda" || lowerText === "/comandos") {
      pushNoelleCoreMessage("system", "Comandos discretos:\n/mem texto — salvar memória\n/memorias — listar memórias\n/esquecer 1 — apagar memória por número\n/limparmemorias — apagar todas\n\nUse as abas internas Texto, Áudio e Ollama para configurar a Noelle.");
      return;
    }

    if (lowerText.startsWith("/mem ")) {
      const memory = text.slice(5).trim();
      const result = await window.desktopWidget?.noelleCoreRemember?.(memory);
      pushNoelleCoreMessage("system", result?.ok ? (result.duplicate ? "Essa memória já existia." : "Memória salva para a Noelle.") : "Falha ao salvar memória: " + (result?.error || "erro desconhecido"));
      return;
    }

    if (lowerText === "/memorias" || lowerText === "/memórias") {
      await showNoelleCoreMemories();
      return;
    }

    if (lowerText.startsWith("/esquecer")) {
      const target = text.replace(/^\/esquecer/i, "").trim() || "last";
      const result = await window.desktopWidget?.noelleCoreForgetMemory?.(target);
      pushNoelleCoreMessage("system", result?.ok
        ? "Memória apagada: " + (result.removed?.text || "item")
        : "Falha ao apagar memória: " + (result?.error || "erro desconhecido")
      );
      return;
    }

    if (lowerText === "/limparmemorias" || lowerText === "/limparmemórias") {
      const result = await window.desktopWidget?.noelleCoreClearMemories?.();
      pushNoelleCoreMessage("system", result?.ok ? "Todas as memórias da NoelleCore foram apagadas." : "Falha ao limpar memórias: " + (result?.error || "erro desconhecido"));
      return;
    }

    const model = byId("coreModelSelect")?.value || "fast";
    const profile = byId("coreProfileSelect")?.value || "turbo";
    const persona = byId("corePersonaSelect")?.value || "nobre";
    setNoelleCoreRuntimeLine("Noelle pensando...", "busy");
    const result = await window.desktopWidget?.noelleCoreChat?.({
      message: text,
      session_id: NOELLE_CORE_SESSION_ID,
      mode: model,
      profile,
      persona
    });

    if (result?.ok) {
      pushNoelleCoreMessage("assistant", result.reply, {
        seconds: result.seconds,
        model: result.model,
        profile: result.profile,
        persona: result.persona,
        tokensPerSecond: result.metrics?.tokens_per_second
      });
      const metricLine = formatNoelleCoreMetrics(result.metrics);
      const slowHint = Number(result.seconds || 0) > 10 ? " · acima de 10s: use Pré-carregar ou Perfil Turbo." : "";
      setNoelleCoreRuntimeLine("Resposta pronta em " + result.seconds + "s" + slowHint + ".", "ok");
      setNoelleCoreStatusLine({
        ok: true,
        core: "NoelleCore",
        ollamaOnline: true,
        activeModel: result.model,
        activeMode: result.mode,
        activeProfile: result.profile,
        activePersona: result.persona,
        activePersonaLabel: result.personaLabel,
        think: false,
        year: 2026,
        country: "Brasil"
      });
    } else {
      const errorText = "Falha na IA: " + (result?.error || "erro desconhecido") + (result?.hint ? "\n" + result.hint : "");
      pushNoelleCoreMessage("system", errorText);
      setNoelleCoreRuntimeLine(result?.hint || "Falha na IA.", "error");
      await refreshNoelleCoreStatus();
    }
  } catch (err) {
    pushNoelleCoreMessage("system", "Erro no NoelleCore: " + String(err?.message || err));
    setNoelleCoreRuntimeLine("Erro no NoelleCore: " + String(err?.message || err), "error");
  } finally {
    setNoelleCoreBusy(false);
    if (input && !customText) input.focus();
  }
}

async function showNoelleCoreMemories() {
  const result = await window.desktopWidget?.noelleCoreMemories?.();
  const memories = Array.isArray(result?.memories) ? result.memories : [];
  pushNoelleCoreMessage("system", memories.length
    ? "Memórias da NoelleCore:\n" + memories.slice(-12).map((m, index) => {
        const date = m.at ? new Date(m.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem data";
        return `${index + 1}. ${m.text || m} (${date})`;
      }).join("\n") + "\n\nComandos: /esquecer 1 ou /limparmemorias"
    : "Nenhuma memória salva ainda."
  );
}

async function setupNoelleCoreChat() {
  renderNoelleCoreChat();
  setupNoelleCoreInternalTabs();
  restoreNoelleSttConfig();
  ["coreSttModelSelect", "coreSttComputeSelect", "coreSttLanguageSelect", "coreSttRecordSecondsSelect"].forEach((id) => {
    const el = byId(id);
    if (el) el.addEventListener("change", () => {
      saveNoelleSttConfig();
      const cfg = getNoelleAudioSttConfig();
      setNoelleCoreRuntimeLine("Áudio: faster-whisper " + cfg.model + " · " + cfg.computeType + " · " + cfg.languageLabel + " · " + cfg.recordSeconds + "s", "normal");
    });
  });

  bind("coreSendBtn", () => sendNoelleCoreMessage());
  bind("coreMicBtn", () => startNoelleCoreVoiceInput());
  bind("coreSttStopBtn", () => stopNoelleCoreVoiceInput());
  bind("coreSttStatusBtn", () => {
    const cfg = getNoelleAudioSttConfig();
    const hasApi = !!window.desktopWidget?.noelleCoreTranscribeAudio;
    const sttStatusMessage = hasApi
      ? [
          "STT local pronto para chamar o faster-whisper.",
          "Modelo: " + cfg.model,
          "Compute: " + cfg.computeType,
          "Idioma: " + cfg.languageLabel,
          "Gravação: " + cfg.recordSeconds + "s",
          "Se for o primeiro uso, o modelo pode baixar/cachear."
        ].join("\n")
      : "STT local não está exposto no preload. Aplique o patch completo e rode PREPARAR_AUDIO_STT.bat.";
    pushNoelleCoreMessage("system", sttStatusMessage);
    setNoelleCoreRuntimeLine(hasApi ? "STT configurado." : "STT indisponível no preload.", hasApi ? "ok" : "error");
  });
  setNoelleMicState("idle", "🎙");
  const input = byId("coreChatInput");
  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendNoelleCoreMessage();
      }
    });
  }

  bind("coreStatusBtn", async () => {
    const status = await refreshNoelleCoreStatus();
    pushNoelleCoreMessage("system", status?.ollamaOnline
      ? `Status OK. Modelo ativo: ${status.activeModel}. Perfil: ${status.activeProfile}.`
      : `Ollama offline ou indisponível. ${status?.ollamaError || status?.error || ""}`.trim()
    );
  });

  bind("corePreloadBtn", async () => {
    setNoelleCoreBusy(true, "Enviar");
    setNoelleCoreRuntimeLine("Pré-carregando modelo no Ollama...", "busy");
    const result = await window.desktopWidget?.noelleCorePreload?.();
    pushNoelleCoreMessage("system", result?.ok
      ? "Modelo pré-carregado: " + result.model + "."
      : "Falha ao pré-carregar: " + (result?.error || "erro desconhecido") + (result?.hint ? "\n" + result.hint : "")
    );
    setNoelleCoreRuntimeLine(result?.ok ? "Modelo pré-carregado. A próxima resposta tende a ser mais rápida." : (result?.hint || "Falha ao pré-carregar."), result?.ok ? "ok" : "error");
    await refreshNoelleCoreStatus();
    setNoelleCoreBusy(false);
  });

  bind("coreUnloadBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreUnload?.();
    pushNoelleCoreMessage("system", result?.ok
      ? "Modelo descarregado da RAM: " + result.model + "."
      : "Falha ao descarregar: " + (result?.error || "erro desconhecido")
    );
    setNoelleCoreRuntimeLine(result?.ok ? "Modelo descarregado da RAM." : "Falha ao descarregar modelo.", result?.ok ? "ok" : "error");
    await refreshNoelleCoreStatus();
  });

  bind("coreResetBtn", async () => {
    writeNoelleCoreHistory([]);
    renderNoelleCoreChat();
    await window.desktopWidget?.noelleCoreReset?.(NOELLE_CORE_SESSION_ID);
    pushNoelleCoreMessage("system", "Conversa limpa.");
  });

  bind("coreRememberBtn", async () => {
    const inputText = String(byId("coreChatInput")?.value || "").trim();
    if (!inputText) {
      pushNoelleCoreMessage("system", "Digite algo no campo de mensagem para salvar como memória.");
      return;
    }
    const result = await window.desktopWidget?.noelleCoreRemember?.(inputText);
    pushNoelleCoreMessage("system", result?.ok ? "Memória salva." : "Falha ao salvar memória: " + (result?.error || "erro desconhecido"));
  });

  bind("coreMemoriesBtn", async () => {
    await showNoelleCoreMemories();
  });

  bind("coreForgetMemoryBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreForgetMemory?.("last");
    pushNoelleCoreMessage("system", result?.ok
      ? "Última memória apagada: " + (result.removed?.text || "item") + "."
      : "Falha ao apagar memória: " + (result?.error || "erro desconhecido")
    );
  });

  bind("coreClearMemoriesBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreClearMemories?.();
    pushNoelleCoreMessage("system", result?.ok
      ? "Todas as memórias da NoelleCore foram apagadas."
      : "Falha ao limpar memórias: " + (result?.error || "erro desconhecido")
    );
  });

  bind("coreDiagnosticBtn", async () => {
    setNoelleCoreRuntimeLine("Rodando diagnóstico do NoelleCore...", "busy");
    const result = await window.desktopWidget?.noelleCoreDiagnostic?.();
    setNoelleCoreStatusLine(result);
    pushNoelleCoreMessage("system", formatNoelleCoreDiagnostic(result));
    setNoelleCoreRuntimeLine(result?.ok ? "Diagnóstico concluído." : "Diagnóstico falhou.", result?.ok ? "ok" : "error");
  });

  bind("coreBenchBtn", async () => {
    setNoelleCoreBusy(true, "Enviar");
    setNoelleCoreRuntimeLine("Rodando bench curto do modelo ativo...", "busy");
    try {
      const result = await window.desktopWidget?.noelleCoreBench?.();
      if (result?.ok) {
        const metrics = formatNoelleCoreMetrics(result.metrics);
        pushNoelleCoreMessage("system", "Bench OK: " + result.seconds + "s com " + result.model + "." + (metrics ? "\n" + metrics : ""));
        setNoelleCoreRuntimeLine("Bench concluído em " + result.seconds + "s" + (metrics ? " · " + metrics : "") + ".", "ok");
      } else {
        pushNoelleCoreMessage("system", "Bench falhou: " + (result?.error || "erro desconhecido") + (result?.hint ? "\n" + result.hint : ""));
        setNoelleCoreRuntimeLine(result?.hint || "Bench falhou.", "error");
      }
      await refreshNoelleCoreStatus();
    } finally {
      setNoelleCoreBusy(false);
    }
  });

  const modelSelect = byId("coreModelSelect");
  if (modelSelect) {
    modelSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetModel?.(modelSelect.value);
      pushNoelleCoreMessage("system", result?.ok
        ? "Modelo ativo agora: " + result.activeModel + "."
        : "Falha ao trocar modelo: " + (result?.error || "erro desconhecido")
      );
      setNoelleCoreRuntimeLine(result?.ok ? "Modelo trocado. Use Pré-carregar para reduzir a primeira demora." : "Falha ao trocar modelo.", result?.ok ? "ok" : "error");
      await refreshNoelleCoreStatus();
    });
  }

  const profileSelect = byId("coreProfileSelect");
  if (profileSelect) {
    profileSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetProfile?.(profileSelect.value);
      pushNoelleCoreMessage("system", result?.ok
        ? "Perfil ativo agora: " + (result.activeProfileLabel || result.activeProfile) + "."
        : "Falha ao trocar perfil: " + (result?.error || "erro desconhecido")
      );
      setNoelleCoreRuntimeLine(result?.ok ? "Perfil atualizado." : "Falha ao trocar perfil.", result?.ok ? "ok" : "error");
      await refreshNoelleCoreStatus();
    });
  }

  const personaSelect = byId("corePersonaSelect");
  if (personaSelect) {
    personaSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetPersona?.(personaSelect.value);
      pushNoelleCoreMessage("system", result?.ok
        ? "Persona ativa agora: " + (result.activePersonaLabel || result.activePersona) + "."
        : "Falha ao trocar persona: " + (result?.error || "erro desconhecido")
      );
      setNoelleCoreRuntimeLine(result?.ok ? "Persona da Noelle atualizada." : "Falha ao trocar persona.", result?.ok ? "ok" : "error");
      await refreshNoelleCoreStatus();
    });
  }

  try {
    await refreshNoelleCoreStatus();
  } catch (err) {
    setNoelleCoreStatusLine({ ok: false, error: String(err?.message || err) });
  }
}


async function main() {
  await initDesktopEnvironment();

  const [motions, items, windowState] = await Promise.all([
    loadMotionManifest(),
    loadItemManifest(),
    window.desktopWidget?.getWindowState?.()
  ]);

  controlManager.setKnownItems(items);
  cachedWindowState = windowState || null;
  updateWindowSummary(windowState);
  updateSummaries();
  setupTabs();
  await setupNoelleCoreChat();
  bind("themeNoelleBtn", () => setThemePreset("noelle"));
  bind("themeNoelleClassicBtn", () => setThemePreset("noelle_classic"));
  bind("themeDarkBtn", () => setThemePreset("dark"));
  bind("themeLightBtn", () => setThemePreset("light"));
  bind("themeSystemBtn", () => setThemePreset("system"));
  presetButtonState(localStorage.getItem("noelle_preset") || "full");
  setSizeButtonState("sizeMediumBtn");
  syncTuningControls();
  syncUiPrefControls();

  buildMotionCarousel(motions, (motionId) => {
    localStorage.setItem("noelle_last_motion", motionId);
    updateSummaries();
    window.desktopWidget?.sendAvatarCommand({ type: "playMotion", motionId });
  });

  function refreshInventoryViews() {
    buildInventoryGrid(items, controlManager, onOpenItemMenu);
    updateSummaries();
  }

  function onOpenItemMenu(item, cardEl) {
    const actions = buildContextActions(item, controlManager);
    openItemMenu(cardEl, item, actions, async (entry) => {
      const isUnequip = entry.actionType === "unequip" || entry.label.toLowerCase().includes("desequipar");

      if (isUnequip) {
        controlManager.unequip(item.id);
        window.desktopWidget?.sendAvatarCommand({ type: "unequipItem", itemId: item.id });
      } else if (entry.slot) {
        controlManager.equip(item, entry.slot);
        window.desktopWidget?.sendAvatarCommand({ type: "equipItem", itemId: item.id, slot: entry.slot });
      } else if (typeof entry.action === "function") {
        entry.action();
      }

      refreshInventoryViews();
      setTimeout(refreshInventoryViews, 250);
    });
  }

  buildInventoryGrid(items, controlManager, onOpenItemMenu);

  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    const insideMenu = target && typeof target.closest === "function" ? target.closest("#itemMenu, .inventory-card") : null;
    if (!insideMenu) closeItemMenu();
  });

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      const prefs = loadUiPrefs();
      presetButtonState(preset);
      window.desktopWidget?.sendAvatarCommand({ type: "setPreset", preset });
      if (prefs.autoCenterOnPreset) {
        setTimeout(() => window.desktopWidget?.sendAvatarCommand({ type: "centerAvatar" }), 180);
      }
    });
  });

  bind("centerBtn", () => window.desktopWidget?.sendAvatarCommand({ type: "centerAvatar" }));
  bind("resetPositionBtn", () => window.desktopWidget?.resetAvatarWindowPosition());
  bind("sizeSmallBtn", () => { setSizeButtonState("sizeSmallBtn"); window.desktopWidget?.setAvatarWindowSize("small"); });
  bind("sizeMediumBtn", () => { setSizeButtonState("sizeMediumBtn"); window.desktopWidget?.setAvatarWindowSize("medium"); });
  bind("sizeLargeBtn", () => { setSizeButtonState("sizeLargeBtn"); window.desktopWidget?.setAvatarWindowSize("large"); });
  bind("showAvatarBtn", () => window.desktopWidget?.showAvatar());

  bind("replayBtn", () => {
    const lastMotion = localStorage.getItem("noelle_last_motion") || "VRMA_02";
    window.desktopWidget?.sendAvatarCommand({ type: "playMotion", motionId: lastMotion });
  });
  bind("pauseBtn", () => window.desktopWidget?.sendAvatarCommand({ type: "togglePauseMotion" }));
  bind("stopBtn", () => window.desktopWidget?.sendAvatarCommand({ type: "stopMotion" }));

  bind("pinBtn", () => window.desktopWidget?.toggleAvatarAlwaysOnTop());
  bind("clickThroughBtn", () => window.desktopWidget?.toggleAvatarClickThrough());
  bind("hideAvatarBtn", () => window.desktopWidget?.hideAvatar());
  bind("hideControlsBtn", () => window.desktopWidget?.hideControls());
  bind("showControlsBtn", () => window.desktopWidget?.showControls());
  bind("backToMenuBtn", async () => {
    window.desktopWidget?.showLauncher?.();
    window.desktopWidget?.hideControls?.();
  });
  bind("importAvatarBtn", () => importAvatarAgainFromControls());
  bind("quitBtn", () => window.desktopWidget?.quitApp());

  bind("applyTuningBtn", () => {
    applyTuningFromControls({ live: true });
    setPresetIoStatus("Ajustes aplicados ao avatar.");
  });

  bind("resetTuningBtn", () => {
    resetTuning();
    setPresetIoStatus("Ajustes resetados para o padrão.");
  });

  bind("alignHigherBtn", () => {
    const current = loadAvatarTuning();
    nudgeTuning({ spawnY: Number((current.spawnY + 0.05).toFixed(2)) });
  });

  bind("alignLowerBtn", () => {
    const current = loadAvatarTuning();
    nudgeTuning({ spawnY: Number((current.spawnY - 0.05).toFixed(2)) });
  });

  bind("alignCloserBtn", () => {
    const currentScale = Number(localStorage.getItem("noelle_scale") || loadAvatarTuning().defaultScale);
    nudgeTuning({ defaultScale: Number(Math.min(1.2, currentScale + 0.03).toFixed(2)) });
  });

  ["spawnXRange","spawnYRange","defaultScaleRange","frameOffsetXRange","frameOffsetYRange"].forEach((id) => {
    const el = byId(id);
    if (el) {
      el.addEventListener("input", () => applyTuningFromControls({ live: true }));
    }
  });

  bind("applyUiPrefsBtn", () => applyUiPrefsFromControls());
  bind("clearAvatarItemsBtn", () => {
    localStorage.removeItem("noelle_equipped_items");
    window.desktopWidget?.sendAvatarCommand({ type: "clearAvatarItems" });
    setPresetIoStatus("Itens removidos do avatar.");
    setTimeout(() => location.reload(), 250);
  });
  bind("clearAvatarItemsBtnAlt", () => {
    localStorage.removeItem("noelle_equipped_items");
    window.desktopWidget?.sendAvatarCommand({ type: "clearAvatarItems" });
    setPresetIoStatus("Itens removidos do avatar.");
    setTimeout(() => location.reload(), 250);
  });
  bind("rotateLeftBtn", () => {
    window.desktopWidget?.sendAvatarCommand({ type: "rotateAvatar", deltaY: -0.261799 });
    setPresetIoStatus("Avatar girado para esquerda e salvo.");
  });
  bind("rotateRightBtn", () => {
    window.desktopWidget?.sendAvatarCommand({ type: "rotateAvatar", deltaY: 0.261799 });
    setPresetIoStatus("Avatar girado para direita e salvo.");
  });
  bind("resetRotationBtn", () => {
    window.desktopWidget?.sendAvatarCommand({ type: "resetAvatarRotation" });
    setPresetIoStatus("Rotação do avatar resetada.");
  });
  bind("saveAvatarViewBtn", () => {
    applyTuningFromControls({ live: false });
    window.desktopWidget?.sendAvatarCommand({ type: "centerAvatar" });
    setPresetIoStatus("Posição/escala do avatar salvas para este avatar.");
  });
  bind("resetUiPrefsBtn", () => {
    saveUiPrefs({ ...DEFAULT_UI_PREFS, theme: "noelle_classic" });
    localStorage.removeItem("noelle_equipped_items");
    syncUiPrefControls();
    applyUiPrefsFromControls();
    setPresetIoStatus("Interface resetada.");
  });
  bind("copyDiagnosticBtn", () => copyDiagnostic());

  ["themeSelect","performanceModeSelect","reducedTransparencyToggle","expressionOverlayToggle","autoCenterOnPresetToggle"].forEach((id) => {
    const el = byId(id);
    if (el) {
      el.addEventListener("change", () => applyUiPrefsFromControls());
    }
  });

  bind("exportPresetBtn", async () => {
    try {
      const snapshot = getCurrentPresetSnapshot();
      const result = await savePresetWithFallback(snapshot);
      setPresetIoStatus(result.mode === "native" ? "Preset exportado via diálogo nativo." : "Preset exportado com fallback do navegador.");
    } catch (err) {
      setPresetIoStatus("Falha ao exportar preset: " + err);
    }
  });

  bind("importPresetBtn", async () => {
    try {
      const result = await openPresetWithFallback();
      if (!result.ok || !result.text) {
        setPresetIoStatus("Importação cancelada.");
        return;
      }
      const parsed = JSON.parse(result.text);
      const applied = applyPresetSnapshot(parsed);

      presetButtonState(applied.presetName);
      syncTuningControls();
      syncUiPrefControls();
      updateSummaries();
      updateWindowSummary(cachedWindowState);
      refreshInventoryViews();

      await window.desktopWidget?.setThemeSourceNative?.(applied.uiPrefs.theme === 'light' ? 'light' : applied.uiPrefs.theme === 'system' ? 'system' : 'dark');
      window.desktopWidget?.sendAvatarCommand({
        type: "applyImportedPreset",
        presetName: applied.presetName,
        scale: applied.scale,
        lastMotionId: applied.lastMotionId
      });
      window.desktopWidget?.sendAvatarCommand({
        type: "updateUiPrefs",
        uiPrefs: applied.uiPrefs
      });

      setPresetIoStatus(result.mode === "native" ? "Preset importado via diálogo nativo." : "Preset importado com fallback do navegador.");
    } catch (err) {
      setPresetIoStatus("Falha ao importar preset: " + err);
    }
  });

  window.desktopWidget?.onWindowState?.((payload) => {
    updateWindowSummary(payload);
    window.desktopWidget?.refreshTrayMenu?.();
  });

  window.addEventListener("storage", () => {
    updateSummaries();
    updateWindowSummary(cachedWindowState);
    syncTuningControls();
    syncUiPrefControls();
  });

  setInterval(() => {
    if ((localStorage.getItem("noelle_controls_tab") || "home") === "inventory") {
      refreshInventoryViews();
    }
    updateSummaries();
  }, 5000);

  setDiagnosticStatus("Pré-release pronto para testes.");
}

main().catch((err) => {
  const summary = byId("windowSummary");
  if (summary) summary.textContent = "Erro ao iniciar controles: " + err;
  console.error(err);
});
