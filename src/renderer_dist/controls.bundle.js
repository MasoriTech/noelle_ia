// src/renderer/config.js
var AVATAR_CONFIG = {
  minScale: 0.6,
  maxScale: 1.7,
  defaultScale: 0.89,
  spawnX: 0,
  spawnY: -0.37,
  spawnZ: 0,
  frameOffsetX: 0,
  frameOffsetY: 0.06,
  idleFloatAmount: 4e-3
};
var AVATAR_TUNING_SCHEMA_VERSION = 3;
var DEFAULT_AVATAR_TUNING = {
  spawnX: AVATAR_CONFIG.spawnX,
  spawnY: AVATAR_CONFIG.spawnY,
  spawnZ: AVATAR_CONFIG.spawnZ,
  defaultScale: AVATAR_CONFIG.defaultScale,
  frameOffsetX: AVATAR_CONFIG.frameOffsetX,
  frameOffsetY: AVATAR_CONFIG.frameOffsetY,
  rotationY: 0,
  __version: AVATAR_TUNING_SCHEMA_VERSION
};
var DEFAULT_UI_PREFS = {
  theme: "noelle_classic",
  reducedTransparency: false,
  performanceMode: "balanced",
  expressionOverlay: true,
  autoCenterOnPreset: true
};
var CAMERA_PRESETS = {
  face: { x: 0, y: 1.74, z: 1.08, scale: 1.1, targetX: 0, targetY: 1.55, label: "Rosto" },
  bust: { x: 0, y: 1.58, z: 1.48, scale: 0.94, targetX: 0, targetY: 1.26, label: "Busto" },
  half: { x: 0, y: 1.48, z: 2.2, scale: 0.82, targetX: 0, targetY: 0.96, label: "Meio corpo" },
  full: { x: 0, y: 1.62, z: 4.25, scale: 0.89, targetX: 0, targetY: 0.46, label: "Corpo inteiro" }
};
var SLOT_LABELS = {
  right_hand: "M\xE3o direita",
  left_hand: "M\xE3o esquerda",
  back_mount: "Costas",
  head: "Cabe\xE7a",
  waist: "Cintura",
  scene_front: "Cena",
  two_hands: "Duas m\xE3os"
};
function loadAvatarTuning() {
  try {
    const raw = localStorage.getItem("noelle_avatar_tuning");
    if (!raw) {
      localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
      return { ...DEFAULT_AVATAR_TUNING };
    }
    const parsed = JSON.parse(raw);
    if (parsed?.__version !== AVATAR_TUNING_SCHEMA_VERSION) {
      localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
      localStorage.setItem("noelle_avatar_tuning", JSON.stringify(DEFAULT_AVATAR_TUNING));
      return { ...DEFAULT_AVATAR_TUNING };
    }
    return { ...DEFAULT_AVATAR_TUNING, ...parsed };
  } catch {
    localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
    return { ...DEFAULT_AVATAR_TUNING };
  }
}
function saveAvatarTuning(tuning) {
  const merged = { ...DEFAULT_AVATAR_TUNING, ...tuning || {}, __version: AVATAR_TUNING_SCHEMA_VERSION };
  localStorage.setItem("noelle_avatar_tuning", JSON.stringify(merged));
  return merged;
}
function loadUiPrefs() {
  try {
    const raw = localStorage.getItem("noelle_ui_prefs");
    if (!raw) return { ...DEFAULT_UI_PREFS };
    return { ...DEFAULT_UI_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}
function saveUiPrefs(nextPrefs) {
  const merged = { ...DEFAULT_UI_PREFS, ...nextPrefs || {} };
  localStorage.setItem("noelle_ui_prefs", JSON.stringify(merged));
  return merged;
}

// src/renderer/local_assets.js
function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/^\.?\//, "");
}
async function assetExistsLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.assetExists) {
    return !!await window.desktopWidget.assetExists(clean);
  }
  try {
    const url = new URL(`../${clean}`, import.meta.url);
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
async function readJsonAssetLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.readJsonAsset) {
    return await window.desktopWidget.readJsonAsset(clean);
  }
  const url = new URL(`../${clean}`, import.meta.url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao ler asset JSON: " + clean);
  return res.json();
}
async function getAssetFileUrlLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.getAssetFileUrl) {
    return await window.desktopWidget.getAssetFileUrl(clean);
  }
  return new URL(`../${clean}`, import.meta.url).href;
}

// src/renderer/motions.js
async function loadMotionManifest() {
  const motions = await readJsonAssetLocal("assets/motion_manifest.json");
  const validated = await Promise.all(
    motions.map(async (motion) => {
      const rel = `assets/motions/${motion.file}`;
      const ok = await assetExistsLocal(rel);
      const assetUrl = ok ? await getAssetFileUrlLocal(rel) : null;
      return { motion: { ...motion, assetUrl }, ok };
    })
  );
  return validated.filter((x) => x.ok).map((x) => x.motion);
}

// src/renderer/items.js
var TWO_HAND_ITEM_IDS = /* @__PURE__ */ new Set(["basketball", "acoustic_guitar_black"]);
var ALLOWED_SLOTS = ["right_hand", "left_hand", "back_mount", "two_hands", "scene_front", "head", "waist"];
async function loadItemManifest() {
  const items = await readJsonAssetLocal("assets/item_manifest.json");
  const validated = await Promise.all(items.map(async (item) => {
    const fileRel = `assets/items/${item.file}`;
    const thumbRel = item.thumbnail ? `assets/items/${item.thumbnail}` : null;
    const fileOk = await assetExistsLocal(fileRel);
    const thumbOk = thumbRel ? await assetExistsLocal(thumbRel) : false;
    return {
      ...item,
      supported_modes: item.supported_modes || [],
      __available: fileOk,
      assetUrl: fileOk ? await getAssetFileUrlLocal(fileRel) : null,
      thumbnailUrl: thumbOk ? await getAssetFileUrlLocal(thumbRel) : null,
      thumbnail: thumbOk ? item.thumbnail : null
    };
  }));
  return validated.filter((item) => item.__available);
}
function normalizeSlotName(slot) {
  if (!slot) return "right_hand";
  return ALLOWED_SLOTS.includes(slot) ? slot : "right_hand";
}
function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot;
}
function shouldOfferTwoHands(item) {
  const modes = item.supported_modes || [];
  return TWO_HAND_ITEM_IDS.has(item.id) || modes.includes("two_hand_guitar") || modes.includes("two_hand_ball") || modes.includes("two_hands") || item.default_interaction === "two_hand_guitar" || item.default_interaction === "two_hand_ball";
}
function buildContextActions(item, manager) {
  const equippedSlot = manager.getEquippedSlot(item.id);
  const actions = [];
  if (equippedSlot) {
    actions.push({ label: `Desequipar (${manager.slotLabel(equippedSlot)})`, actionType: "unequip", itemId: item.id });
  } else {
    actions.push({ label: "Equipar", slot: normalizeSlotName(item.slot) });
  }
  const sceneItem = item.slot === "scene_front" || item.category === "scene" || (item.supported_modes || []).includes("scene_front");
  if (sceneItem) {
    actions.push({ label: "Posicionar na cena", slot: "scene_front" });
  } else {
    if (shouldOfferTwoHands(item)) {
      actions.push({ label: "Usar em duas m\xE3os", slot: "two_hands" });
    }
    actions.push({ label: "Equipar na m\xE3o direita", slot: "right_hand" });
    actions.push({ label: "Equipar na m\xE3o esquerda", slot: "left_hand" });
    actions.push({ label: "Equipar nas costas", slot: "back_mount" });
  }
  return actions;
}

// src/renderer/ui.js
function byId(id) {
  return document.getElementById(id);
}
var MOTION_THUMBS = [
  "./assets/expressions/happy.png",
  "./assets/expressions/sad.png",
  "./assets/expressions/angry.png",
  "./assets/expressions/sick.png",
  "../assets/icons/noelle_256.png"
];
function motionThumbFor(index) {
  return MOTION_THUMBS[index % MOTION_THUMBS.length];
}
function renderMotionTrack(track, motions, onSelect) {
  if (!track) return;
  track.innerHTML = "";
  motions.forEach((motion, index) => {
    const card = document.createElement("button");
    card.className = "motion-card";
    const icon = motion.thumbnail || motionThumbFor(index);
    card.innerHTML = `
      <div class="motion-emoji"><img src="${icon}" alt="${motion.label}"></div>
      <div class="motion-title">${motion.label}</div>
    `;
    card.addEventListener("click", () => onSelect(motion.id));
    track.appendChild(card);
  });
}
function buildMotionCarousel(motions, onSelect) {
  const tracks = [
    byId("motionCarouselTrack"),
    byId("motionCarouselTrackAlt")
  ].filter(Boolean);
  tracks.forEach((track) => renderMotionTrack(track, motions, onSelect));
  const bindings = [
    ["motionCarouselTrack", "motionPrevBtn", "motionNextBtn"],
    ["motionCarouselTrackAlt", "motionPrevBtnAlt", "motionNextBtnAlt"]
  ];
  bindings.forEach(([trackId, prevId, nextId]) => {
    const track = byId(trackId);
    const prev = byId(prevId);
    const next = byId(nextId);
    if (prev && track) prev.onclick = () => track.scrollBy({ left: -240, behavior: "smooth" });
    if (next && track) next.onclick = () => track.scrollBy({ left: 240, behavior: "smooth" });
  });
}
function renderInventoryGrid(grid, items, manager, onOpenMenu) {
  if (!grid) return;
  grid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "inventory-card";
    if (manager.isEquipped(item.id)) card.classList.add("equipped");
    card.dataset.itemId = item.id;
    const thumb = item.thumbnailUrl || (item.thumbnail ? `./assets/items/${item.thumbnail}` : "");
    const equippedSlot = manager.getEquippedSlot(item.id);
    const equippedText = equippedSlot ? `<div class="inventory-equipped">\u2713 ${manager.slotLabel(equippedSlot)}</div>` : "";
    card.innerHTML = `
      <div class="inventory-thumb">${thumb ? `<img src="${thumb}" alt="${item.label}">` : "\u{1F4E6}"}</div>
      <div class="inventory-name">${item.label}</div>
      <div class="inventory-slot">${equippedSlot ? manager.slotLabel(equippedSlot) : item.slot}</div>
      ${equippedText}
    `;
    card.addEventListener("click", (event) => onOpenMenu(item, card, event));
    grid.appendChild(card);
  });
}
function buildInventoryGrid(items, manager, onOpenMenu) {
  const grids = [
    byId("inventoryGrid"),
    byId("inventoryGridAlt")
  ].filter(Boolean);
  grids.forEach((grid) => renderInventoryGrid(grid, items, manager, onOpenMenu));
}
function openItemMenu(cardEl, _item, actions, onChoose) {
  const menu = byId("itemMenu");
  if (!menu || !cardEl) return;
  menu.innerHTML = "";
  const rect = cardEl.getBoundingClientRect();
  actions.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = "context-item";
    const icon = document.createElement("span");
    icon.className = "context-icon";
    icon.textContent = entry.actionType === "unequip" || entry.label.toLowerCase().includes("desequipar") ? "\u26D4" : entry.label.toLowerCase().includes("direita") ? "\u{1F449}" : entry.label.toLowerCase().includes("esquerda") ? "\u{1F448}" : entry.label.toLowerCase().includes("duas m\xE3os") ? "\u{1F64C}" : entry.label.toLowerCase().includes("costas") ? "\u{1F392}" : entry.label.toLowerCase().includes("cena") ? "\u{1F5BC}" : "\u2728";
    const txt = document.createElement("span");
    txt.textContent = entry.label;
    btn.append(icon, txt);
    btn.addEventListener("click", async () => {
      menu.classList.remove("open");
      await onChoose(entry);
    });
    menu.appendChild(btn);
  });
  const menuWidth = 230;
  const menuHeight = Math.min(280, 58 + actions.length * 44);
  menu.style.left = `${Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right + 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(window.innerHeight - menuHeight - 8, rect.top))}px`;
  menu.classList.add("open");
}
function closeItemMenu() {
  const menu = byId("itemMenu");
  if (menu) menu.classList.remove("open");
}
function updateEquippedSummary(manager) {
  const el = byId("inventorySummary");
  if (!el) return;
  manager.syncFromStorage?.();
  const summary = [];
  for (const [slot, entry] of Object.entries(manager.equipped || {})) {
    if (entry?.item) summary.push(`${manager.slotLabel(slot)}: ${entry.item.label}`);
  }
  el.textContent = summary.length ? summary.join(" \u2022 ") : "Nenhum item equipado";
}

// src/renderer/controls_window_app.js
function byId2(id) {
  return document.getElementById(id);
}
function bind(id, handler) {
  const el = byId2(id);
  if (el) el.addEventListener("click", handler);
}
function setPresetIoStatus(text) {
  const el = byId2("presetIoStatus");
  if (el) el.textContent = text;
}
function setDiagnosticStatus(text) {
  const el = byId2("diagnosticStatus");
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
      setPresetIoStatus("Importa\xE7\xE3o do VRM cancelada.");
      return;
    }
    setPresetIoStatus("Falha ao importar VRM: " + (result?.error || "erro desconhecido"));
  } catch (err) {
    setPresetIoStatus("Falha ao importar VRM: " + err);
  }
}
var controlManager = {
  equipped: {},
  itemLabels: /* @__PURE__ */ new Map(),
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
    for (const [currentSlot, entry] of Object.entries(state)) {
      if (entry?.id === item.id) delete state[currentSlot];
    }
    if (slot === "two_hands") {
      delete state.right_hand;
      delete state.left_hand;
      delete state.two_hands;
    }
    if (slot === "right_hand" || slot === "left_hand") {
      delete state.two_hands;
    }
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
var cachedWindowState = null;
var cachedDesktopEnv = null;
function getCurrentPresetSnapshot() {
  const tuning = loadAvatarTuning();
  const uiPrefs = loadUiPrefs();
  return {
    version: 2,
    type: "noelle_avatar_preset",
    savedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ui: {
      preset: localStorage.getItem("noelle_preset") || "full",
      scale: Number(localStorage.getItem("noelle_scale") || tuning.defaultScale || AVATAR_CONFIG.defaultScale),
      lastMotionId: localStorage.getItem("noelle_last_motion") || "VRMA_02",
      uiPrefs
    },
    avatarTuning: { ...DEFAULT_AVATAR_TUNING, ...tuning },
    equippedItems: (() => {
      try {
        return JSON.parse(localStorage.getItem("noelle_equipped_items") || "{}");
      } catch {
        return {};
      }
    })()
  };
}
function applyPresetSnapshot(snapshot) {
  if (!snapshot || snapshot.type !== "noelle_avatar_preset") {
    throw new Error("Arquivo de preset inv\xE1lido.");
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
    uiPrefs
  };
}
function updateSummaries() {
  controlManager.syncFromStorage();
  updateEquippedSummary(controlManager);
  const lastMotion = localStorage.getItem("noelle_last_motion") || "VRMA_02";
  const motionSummary = byId2("motionSummary");
  if (motionSummary) motionSummary.textContent = "\xDAltimo emote: " + lastMotion;
}
function updateWindowSummary(payload) {
  if (payload) cachedWindowState = payload;
  const el = byId2("windowSummary");
  if (!el) return;
  const top = cachedWindowState?.avatarAlwaysOnTop ? "topo ligado" : "topo desligado";
  const click = cachedWindowState?.avatarClickThrough ? "clique atravess\xE1vel ligado" : "clique normal";
  el.textContent = `Avatar separado \u2022 ${top} \u2022 ${click}`;
  const spawnInfo = byId2("spawnInfo");
  if (spawnInfo) {
    const tuning = loadAvatarTuning();
    spawnInfo.textContent = `spawnX ${tuning.spawnX.toFixed(2)} \u2022 spawnY ${tuning.spawnY.toFixed(2)} \u2022 escala ${Number(localStorage.getItem("noelle_scale") || tuning.defaultScale).toFixed(2)}`;
  }
}
function setSizeButtonState(activeSize) {
  ["sizeSmallBtn", "sizeMediumBtn", "sizeLargeBtn"].forEach((id) => {
    const el = byId2(id);
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
    frameOffsetYRange: tuning.frameOffsetY
  };
  Object.entries(mapping).forEach(([id, value]) => {
    const el = byId2(id);
    if (el) el.value = String(value);
  });
  const values = {
    spawnXValue: tuning.spawnX,
    spawnYValue: tuning.spawnY,
    defaultScaleValue: scaleValue,
    frameOffsetXValue: tuning.frameOffsetX,
    frameOffsetYValue: tuning.frameOffsetY
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = byId2(id);
    if (el) el.textContent = Number(value).toFixed(2);
  });
  updateWindowSummary(cachedWindowState);
}
function syncUiPrefControls() {
  const prefs = loadUiPrefs();
  const themeSelect = byId2("themeSelect");
  const performanceModeSelect = byId2("performanceModeSelect");
  const reducedTransparencyToggle = byId2("reducedTransparencyToggle");
  const expressionOverlayToggle = byId2("expressionOverlayToggle");
  const autoCenterOnPresetToggle = byId2("autoCenterOnPresetToggle");
  if (themeSelect) themeSelect.value = prefs.theme;
  if (performanceModeSelect) performanceModeSelect.value = prefs.performanceMode;
  if (reducedTransparencyToggle) reducedTransparencyToggle.checked = !!prefs.reducedTransparency;
  if (expressionOverlayToggle) expressionOverlayToggle.checked = !!prefs.expressionOverlay;
  if (autoCenterOnPresetToggle) autoCenterOnPresetToggle.checked = !!prefs.autoCenterOnPreset;
  const themeValue = byId2("themeValue");
  const performanceModeValue = byId2("performanceModeValue");
  if (themeValue) themeValue.textContent = prefs.theme;
  if (performanceModeValue) performanceModeValue.textContent = prefs.performanceMode;
  document.body.classList.toggle("theme-light", prefs.theme === "light");
  document.body.classList.toggle("theme-dark", prefs.theme === "dark");
  document.body.classList.toggle("theme-noelle-classic", prefs.theme === "noelle_classic");
  document.body.classList.toggle("theme-noelle", prefs.theme === "noelle" || prefs.theme === "system");
  document.body.classList.toggle("reduced-transparency", !!prefs.reducedTransparency);
  ["themeNoelleBtn", "themeNoelleClassicBtn", "themeDarkBtn", "themeLightBtn", "themeSystemBtn"].forEach((id) => {
    const btn = byId2(id);
    if (!btn) return;
    const value = btn.dataset.themeValue;
    btn.classList.toggle("active", value === prefs.theme || prefs.theme === "system" && value === "system");
  });
}
function setThemePreset(theme) {
  const themeSelect = byId2("themeSelect");
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
    theme: byId2("themeSelect")?.value || "system",
    performanceMode: byId2("performanceModeSelect")?.value || "balanced",
    reducedTransparency: !!byId2("reducedTransparencyToggle")?.checked,
    expressionOverlay: !!byId2("expressionOverlayToggle")?.checked,
    autoCenterOnPreset: !!byId2("autoCenterOnPresetToggle")?.checked
  };
  const saved = saveUiPrefs(nextPrefs);
  syncUiPrefControls();
  const nativeTheme = saved.theme === "light" ? "light" : saved.theme === "system" ? "system" : "dark";
  window.desktopWidget?.setThemeSourceNative?.(nativeTheme);
  window.desktopWidget?.sendAvatarCommand({
    type: "updateUiPrefs",
    uiPrefs: saved
  });
  setPresetIoStatus("Prefer\xEAncias aplicadas.");
}
function applyTuningFromControls({ live = true } = {}) {
  const current = loadAvatarTuning();
  const next = {
    ...current,
    spawnX: Number(byId2("spawnXRange")?.value ?? current.spawnX),
    spawnY: Number(byId2("spawnYRange")?.value ?? current.spawnY),
    defaultScale: Number(byId2("defaultScaleRange")?.value ?? current.defaultScale),
    frameOffsetX: Number(byId2("frameOffsetXRange")?.value ?? current.frameOffsetX),
    frameOffsetY: Number(byId2("frameOffsetYRange")?.value ?? current.frameOffsetY)
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
    ...partial
  };
  saveAvatarTuning(next);
  if (partial.defaultScale !== void 0) {
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
  const defaultPath = `noelle_preset_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`;
  try {
    const nativeResult = await window.desktopWidget?.saveTextFileNative?.({ text, defaultPath });
    if (nativeResult && !nativeResult.canceled && !nativeResult.error) {
      return { ok: true, mode: "native", path: nativeResult.filePath };
    }
  } catch {
  }
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultPath;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
  return { ok: true, mode: "fallback" };
}
async function openPresetWithFallback() {
  try {
    const nativeResult = await window.desktopWidget?.openTextFileNative?.();
    if (nativeResult && !nativeResult.canceled && !nativeResult.error && nativeResult.text) {
      return { ok: true, mode: "native", text: nativeResult.text };
    }
  } catch {
  }
  return new Promise((resolve) => {
    const input = byId2("presetFileInput");
    if (!input) {
      resolve({ ok: false, error: "input file n\xE3o encontrado" });
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
    time: (/* @__PURE__ */ new Date()).toISOString(),
    windowState: cachedWindowState,
    desktopEnv: cachedDesktopEnv,
    avatarTuning: tuning,
    uiPrefs,
    preset: localStorage.getItem("noelle_preset") || "full",
    scale: Number(localStorage.getItem("noelle_scale") || tuning.defaultScale),
    lastMotionId: localStorage.getItem("noelle_last_motion") || "VRMA_02",
    equippedItems: (() => {
      try {
        return JSON.parse(localStorage.getItem("noelle_equipped_items") || "{}");
      } catch {
        return {};
      }
    })()
  };
  return JSON.stringify(report, null, 2);
}
async function copyDiagnostic() {
  try {
    await navigator.clipboard.writeText(buildDiagnosticReport());
    setDiagnosticStatus("Diagn\xF3stico copiado.");
  } catch (err) {
    setDiagnosticStatus("Falha ao copiar diagn\xF3stico: " + err);
  }
}
var NOELLE_CORE_SESSION_ID = "noelle_chat";
var NOELLE_CORE_HISTORY_KEY = "noelle_core_chat_history_v1";
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
    at: (/* @__PURE__ */ new Date()).toISOString()
  });
  writeNoelleCoreHistory(items);
  renderNoelleCoreChat();
}
function renderNoelleCoreChat() {
  const logEl = byId2("coreChatLog");
  if (!logEl) return;
  const items = readNoelleCoreHistory();
  if (!items.length) {
    logEl.innerHTML = `
      <div class="chat-bubble system">
        Noelle pronta para conversar. Primeiro teste: \u201Coi\u201D ou \u201Cqual ano estamos\u201D.
      </div>
    `;
    return;
  }
  logEl.innerHTML = items.map((item, idx) => {
    const role = item.role === "user" ? "user" : item.role === "assistant" ? "assistant" : "system";
    const who = role === "user" ? "Voc\xEA" : role === "assistant" ? "Noelle" : "Sistema";
    const meta = role === "assistant" && item.meta?.seconds ? " \xB7 " + escapeHtml(String(item.meta.seconds) + "s") : "";
    const speakBtn = role === "assistant" ? `<button class="btn-speak-item" data-msg-idx="${idx}" title="Ouvir resposta" aria-label="Ouvir resposta">\u{1F50A}</button>` : "";
    return '<div class="chat-bubble ' + role + '"><b>' + who + meta + "</b>" + speakBtn + "<br>" + escapeHtml(item.content) + "</div>";
  }).join("");
  Array.from(logEl.querySelectorAll(".btn-speak-item")).forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const idx = parseInt(btn.dataset.msgIdx, 10);
      const item = items[idx];
      if (!item || item.role !== "assistant") return;
      btn.disabled = true;
      btn.textContent = "\u23F3";
      try {
        const result = await window.desktopWidget?.noelleCoreSpeak?.(item.content, { lang: "pt-BR" });
        if (result?.ok) {
          btn.textContent = "\u2713";
          setTimeout(() => {
            btn.textContent = "\u{1F50A}";
            btn.disabled = false;
          }, 1e3);
        } else {
          btn.title = "Erro ao falar: " + (result?.error || "erro desconhecido");
          btn.textContent = "\u2717";
          setTimeout(() => {
            btn.textContent = "\u{1F50A}";
            btn.disabled = false;
          }, 1500);
        }
      } catch (err) {
        btn.title = "Erro: " + String(err?.message || err);
        btn.textContent = "\u2717";
        setTimeout(() => {
          btn.textContent = "\u{1F50A}";
          btn.disabled = false;
        }, 1500);
      }
    });
  });
  logEl.scrollTop = logEl.scrollHeight;
}
function setNoelleCoreRuntimeLine(message, tone = "normal") {
  const el = byId2("coreRuntimeLine");
  if (!el) return;
  el.textContent = message || "Pronto.";
  el.dataset.tone = tone;
}
function formatNoelleCoreMetrics(metrics = {}) {
  const parts = [];
  if (metrics.eval_count) parts.push(String(metrics.eval_count) + " tokens");
  if (metrics.tokens_per_second) parts.push(String(metrics.tokens_per_second) + " tokens/s");
  if (metrics.load_duration) parts.push("load " + (metrics.load_duration / 1e9).toFixed(2) + "s");
  return parts.join(" \xB7 ");
}
function formatNoelleCoreDiagnostic(status = {}) {
  if (!status.ok) return "Diagn\xF3stico falhou: " + (status.error || "erro desconhecido");
  const lines = [
    "Ollama: " + (status.ollamaOnline ? "online" : "offline"),
    "Modelo ativo: " + status.activeModel,
    "Modelo instalado: " + (status.activeModelInstalled ? "sim" : "n\xE3o"),
    "Modelo carregado: " + (status.activeModelLoaded ? "sim" : "n\xE3o"),
    "Perfil: " + status.activeProfile,
    "Persona: " + (status.activePersonaLabel || status.activePersona || "nobre"),
    "Thinking: " + (status.think ? "ON" : "OFF"),
    "Modelos instalados: " + (status.installedCount ?? 0),
    "Modelos carregados: " + (status.loadedCount ?? 0)
  ];
  if (Array.isArray(status.recommendations) && status.recommendations.length) {
    lines.push("Recomenda\xE7\xF5es:");
    status.recommendations.slice(0, 5).forEach((item) => lines.push("- " + item));
  }
  if (status.lastChatSeconds) lines.push("\xDAltima resposta: " + status.lastChatSeconds + "s");
  return lines.join("\n");
}
function setNoelleCoreStatusLine(status) {
  const el = byId2("coreStatusLine");
  if (!el) return;
  if (!status) {
    el.innerHTML = `<span class="core-chip">NoelleCore aguardando</span>`;
    return;
  }
  if (!status.ok) {
    el.innerHTML = `<span class="core-chip">IA com erro \xB7 ${escapeHtml(status.error || "ver diagn\xF3stico")}</span>`;
    return;
  }
  const online = status.ollamaOnline ? "online" : "offline";
  const profile = status.activeProfile || "rapido";
  const loaded = status.activeModelLoaded ? " \xB7 RAM" : "";
  const missing = status.activeModelInstalled === false ? " \xB7 instalar modelo" : "";
  const compact = status.ollamaOnline ? `IA ${online} \xB7 ${profile}${loaded}${missing}` : "IA offline \xB7 abrir Ollama";
  el.innerHTML = `<span class="core-chip">${escapeHtml(compact)}</span>`;
}
function setNoelleCoreBusy(isBusy, label = "Enviar") {
  const btn = byId2("coreSendBtn");
  const mic = byId2("coreMicBtn");
  const input = byId2("coreChatInput");
  if (btn) {
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? "Pensando..." : label;
  }
  if (mic) mic.disabled = !!isBusy;
  if (input) input.disabled = !!isBusy;
  if (isBusy) setNoelleCoreRuntimeLine("Noelle est\xE1 pensando...", "busy");
}
var noelleCoreAudioStream = null;
var noelleCoreMediaRecorder = null;
var noelleCoreAudioChunks = [];
var noelleCoreAudioTimer = null;
var noelleCoreAudioStartedAt = 0;
var noelleCoreAudioBusy = false;
var NOELLE_AUDIO_RECORD_MS = 1e4;
var NOELLE_AUDIO_MIN_BYTES = 900;
var NOELLE_AUDIO_STT_MODEL = "medium";
var NOELLE_AUDIO_STT_COMPUTE = "int8";
var NOELLE_AUDIO_STT_LANGUAGE = "pt";
var NOELLE_STT_CONFIG_STORAGE_KEY = "noelle_core_stt_config_v1";
function getSelectValue(id, fallback) {
  const el = byId2(id);
  const value = el && typeof el.value === "string" ? el.value.trim() : "";
  return value || fallback;
}
function getNoelleAudioSttConfig() {
  const model = getSelectValue("coreSttModelSelect", NOELLE_AUDIO_STT_MODEL);
  const computeType = getSelectValue("coreSttComputeSelect", NOELLE_AUDIO_STT_COMPUTE);
  const rawLanguage = getSelectValue("coreSttLanguageSelect", NOELLE_AUDIO_STT_LANGUAGE);
  const language = rawLanguage === "auto" ? "" : rawLanguage;
  const seconds = Math.max(4, Math.min(15, Number(getSelectValue("coreSttRecordSecondsSelect", "8")) || 8));
  return { model, computeType, language, languageLabel: rawLanguage === "auto" ? "auto" : rawLanguage, recordMs: seconds * 1e3, recordSeconds: seconds };
}
function saveNoelleSttConfig() {
  try {
    const config = getNoelleAudioSttConfig();
    localStorage.setItem(NOELLE_STT_CONFIG_STORAGE_KEY, JSON.stringify({ model: config.model, computeType: config.computeType, language: config.languageLabel, recordSeconds: config.recordSeconds }));
  } catch (_) {
  }
}
function restoreNoelleSttConfig() {
  try {
    const raw = localStorage.getItem(NOELLE_STT_CONFIG_STORAGE_KEY);
    if (!raw) return;
    const config = JSON.parse(raw);
    const map = { coreSttModelSelect: config.model, coreSttComputeSelect: config.computeType, coreSttLanguageSelect: config.language, coreSttRecordSecondsSelect: String(config.recordSeconds || "") };
    Object.entries(map).forEach(([id, value]) => {
      const el = byId2(id);
      if (el && value) el.value = value;
    });
  } catch (_) {
  }
}
function setupNoelleCoreInternalTabs() {
  const root = document.querySelector(".core-ai-tabs");
  const buttons = Array.from(document.querySelectorAll("[data-core-ai-subtab]"));
  const panels = Array.from(document.querySelectorAll("[data-core-ai-panel]"));
  if (!root || !buttons.length || !panels.length) return;
  function setCollapsed(collapsed2) {
    root.classList.toggle("collapsed", !!collapsed2);
    try {
      localStorage.setItem("noelle_core_ai_tabs_collapsed", collapsed2 ? "1" : "0");
    } catch (_) {
    }
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
    try {
      localStorage.setItem("noelle_core_ai_subtab", safeName);
    } catch (_) {
    }
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
  } catch (_) {
  }
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
  const mic = byId2("coreMicBtn");
  if (!mic) return;
  mic.dataset.state = state;
  if (label) mic.textContent = label;
  if (state === "listening") {
    mic.title = "Parar grava\xE7\xE3o";
    mic.setAttribute("aria-label", "Parar grava\xE7\xE3o");
  } else if (state === "checking") {
    mic.title = "Preparando microfone";
    mic.setAttribute("aria-label", "Preparando microfone");
  } else if (state === "transcribing") {
    mic.title = "Transcrevendo \xE1udio";
    mic.setAttribute("aria-label", "Transcrevendo \xE1udio");
  } else if (state === "blocked") {
    mic.title = "Microfone indispon\xEDvel";
    mic.setAttribute("aria-label", "Microfone indispon\xEDvel");
  } else {
    mic.title = "Falar para preencher o texto";
    mic.setAttribute("aria-label", "Falar para preencher o texto");
  }
}
function appendNoelleVoiceText(transcript) {
  const clean = String(transcript || "").trim();
  const input = byId2("coreChatInput");
  if (!clean || !input) return;
  const current = String(input.value || "").trim();
  input.value = current ? current + " " + clean : clean;
  input.focus();
  try {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (_) {
  }
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
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch (_) {
      return false;
    }
  }) || "";
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler \xE1udio."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve(dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl);
    };
    reader.readAsDataURL(blob);
  });
}
function cleanupNoelleAudioStream() {
  if (noelleCoreAudioStream) {
    try {
      noelleCoreAudioStream.getTracks().forEach((track) => track.stop());
    } catch (_) {
    }
  }
  noelleCoreAudioStream = null;
}
async function transcribeNoelleAudioBlob(blob, mimeType) {
  if (!blob || blob.size < NOELLE_AUDIO_MIN_BYTES) {
    setNoelleCoreRuntimeLine("\xC1udio muito curto. Segure o mic e fale por 2 ou 3 segundos.", "normal");
    return;
  }
  if (!window.desktopWidget?.noelleCoreTranscribeAudio) {
    setNoelleCoreRuntimeLine("Transcri\xE7\xE3o local ainda n\xE3o est\xE1 ligada no preload.", "error");
    return;
  }
  const sttConfig = getNoelleAudioSttConfig();
  noelleCoreAudioBusy = true;
  setNoelleMicState("transcribing", "\u2026");
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
    const reason = result?.error || "N\xE3o consegui transcrever voz clara.";
    setNoelleCoreRuntimeLine(reason, "error");
    if (result?.hint) pushNoelleCoreMessage("system", result.hint);
  } catch (err) {
    setNoelleCoreRuntimeLine("Falha ao transcrever: " + String(err?.message || err), "error");
  } finally {
    noelleCoreAudioBusy = false;
    setNoelleMicState("ready", "\u{1F399}");
  }
}
function stopNoelleCoreVoiceInput() {
  clearNoelleAudioTimer();
  const recorder = noelleCoreMediaRecorder;
  if (recorder && recorder.state !== "inactive") {
    try {
      recorder.stop();
    } catch (_) {
    }
  } else {
    cleanupNoelleAudioStream();
    setNoelleMicState("ready", "\u{1F399}");
  }
}
function triggerAvatarReactionToChat(persona = "nobre") {
  const personaMotionMap = {
    nobre: "VRMA_02",
    // Pose de repouso elegante
    direta: "VRMA_03",
    // Gesto mais enérgico
    fofa: "005_smartphone",
    // Gesto amigável
    seria: "VRMA_01",
    // Pose séria
    brincalhona: "007_gekirei"
    // Gesto festivo
  };
  const motionId = personaMotionMap[persona] || "VRMA_02";
  try {
    window.desktopWidget?.sendAvatarCommand?.({
      type: "playMotion",
      motionId
    });
  } catch (err) {
    console.debug("Avatar reaction unavailable:", err?.message);
  }
}
async function startNoelleCoreVoiceInput() {
  const mic = byId2("coreMicBtn");
  if (!mic || mic.disabled || noelleCoreAudioBusy) return;
  if (noelleCoreMediaRecorder && noelleCoreMediaRecorder.state === "recording") {
    setNoelleCoreRuntimeLine("Finalizando grava\xE7\xE3o...", "busy");
    stopNoelleCoreVoiceInput();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setNoelleMicState("blocked", "\u{1F399}");
    setNoelleCoreRuntimeLine("Grava\xE7\xE3o de \xE1udio indispon\xEDvel neste Electron.", "error");
    pushNoelleCoreMessage("system", "N\xE3o consegui acessar MediaRecorder/getUserMedia. O chat de texto continua funcionando normalmente.");
    return;
  }
  setNoelleMicState("checking", "\u2026");
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
    const options = mimeType ? { mimeType } : void 0;
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
      setNoelleMicState("blocked", "\u{1F399}");
      const reason = event?.error?.message || "erro no gravador de \xE1udio";
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
        setNoelleMicState("ready", "\u{1F399}");
        setNoelleCoreRuntimeLine("Grava\xE7\xE3o curta demais. Fale por alguns segundos.", "normal");
        return;
      }
      const blob = new Blob(chunks, { type: finalMime });
      await transcribeNoelleAudioBlob(blob, finalMime);
    };
    const sttConfig = getNoelleAudioSttConfig();
    recorder.start(1e3);
    setNoelleMicState("listening", "\u25A0");
    setNoelleCoreRuntimeLine("Gravando por at\xE9 " + sttConfig.recordSeconds + "s... clique no mic para parar.", "busy");
    noelleCoreAudioTimer = setTimeout(() => stopNoelleCoreVoiceInput(), sttConfig.recordMs || NOELLE_AUDIO_RECORD_MS);
  } catch (err) {
    clearNoelleAudioTimer();
    cleanupNoelleAudioStream();
    noelleCoreMediaRecorder = null;
    setNoelleMicState("blocked", "\u{1F399}");
    const reason = String(err?.message || err || "permiss\xE3o negada");
    setNoelleCoreRuntimeLine("Microfone n\xE3o autorizado. Texto continua normal.", "error");
    pushNoelleCoreMessage("system", "N\xE3o consegui usar o microfone: " + reason + "\nO chat de texto continua funcionando normalmente.");
  }
}
async function refreshNoelleCoreStatus() {
  const status = await window.desktopWidget?.noelleCoreStatus?.();
  setNoelleCoreStatusLine(status);
  const modelSelect = byId2("coreModelSelect");
  const profileSelect = byId2("coreProfileSelect");
  const personaSelect = byId2("corePersonaSelect");
  if (status?.activeMode && modelSelect) modelSelect.value = status.activeMode;
  if (status?.activeProfile && profileSelect) profileSelect.value = status.activeProfile;
  if (status?.activePersona && personaSelect) personaSelect.value = status.activePersona;
  return status;
}
async function sendNoelleCoreMessage(customText = null, meta = {}) {
  const input = byId2("coreChatInput");
  const text = String(customText ?? input?.value ?? "").trim();
  if (!text) return;
  if (!customText && input) input.value = "";
  pushNoelleCoreMessage("user", text);
  setNoelleCoreBusy(true);
  try {
    const lowerText = text.toLowerCase();
    if (lowerText === "/ajuda" || lowerText === "/comandos") {
      pushNoelleCoreMessage("system", "Comandos discretos:\n/mem texto \u2014 salvar mem\xF3ria\n/memorias \u2014 listar mem\xF3rias\n/esquecer 1 \u2014 apagar mem\xF3ria por n\xFAmero\n/limparmemorias \u2014 apagar todas\n\nUse as abas internas Texto, \xC1udio e Ollama para configurar a Noelle.");
      return;
    }
    if (lowerText.startsWith("/mem ")) {
      const memory = text.slice(5).trim();
      const result2 = await window.desktopWidget?.noelleCoreRemember?.(memory);
      pushNoelleCoreMessage("system", result2?.ok ? result2.duplicate ? "Essa mem\xF3ria j\xE1 existia." : "Mem\xF3ria salva para a Noelle." : "Falha ao salvar mem\xF3ria: " + (result2?.error || "erro desconhecido"));
      return;
    }
    if (lowerText === "/memorias" || lowerText === "/mem\xF3rias") {
      await showNoelleCoreMemories();
      return;
    }
    if (lowerText.startsWith("/esquecer")) {
      const target = text.replace(/^\/esquecer/i, "").trim() || "last";
      const result2 = await window.desktopWidget?.noelleCoreForgetMemory?.(target);
      pushNoelleCoreMessage(
        "system",
        result2?.ok ? "Mem\xF3ria apagada: " + (result2.removed?.text || "item") : "Falha ao apagar mem\xF3ria: " + (result2?.error || "erro desconhecido")
      );
      return;
    }
    if (lowerText === "/limparmemorias" || lowerText === "/limparmem\xF3rias") {
      const result2 = await window.desktopWidget?.noelleCoreClearMemories?.();
      pushNoelleCoreMessage("system", result2?.ok ? "Todas as mem\xF3rias da NoelleCore foram apagadas." : "Falha ao limpar mem\xF3rias: " + (result2?.error || "erro desconhecido"));
      return;
    }
    const model = byId2("coreModelSelect")?.value || "fast";
    const profile = byId2("coreProfileSelect")?.value || "turbo";
    const persona = byId2("corePersonaSelect")?.value || "nobre";
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
      triggerAvatarReactionToChat(result.persona || persona);
      const metricLine = formatNoelleCoreMetrics(result.metrics);
      const slowHint = Number(result.seconds || 0) > 10 ? " \xB7 acima de 10s: use Pr\xE9-carregar ou Perfil Turbo." : "";
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
  pushNoelleCoreMessage(
    "system",
    memories.length ? "Mem\xF3rias da NoelleCore:\n" + memories.slice(-12).map((m, index) => {
      const date = m.at ? new Date(m.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem data";
      return `${index + 1}. ${m.text || m} (${date})`;
    }).join("\n") + "\n\nComandos: /esquecer 1 ou /limparmemorias" : "Nenhuma mem\xF3ria salva ainda."
  );
}
async function setupNoelleCoreChat() {
  renderNoelleCoreChat();
  setupNoelleCoreInternalTabs();
  restoreNoelleSttConfig();
  ["coreSttModelSelect", "coreSttComputeSelect", "coreSttLanguageSelect", "coreSttRecordSecondsSelect"].forEach((id) => {
    const el = byId2(id);
    if (el) el.addEventListener("change", () => {
      saveNoelleSttConfig();
      const cfg = getNoelleAudioSttConfig();
      setNoelleCoreRuntimeLine("\xC1udio: faster-whisper " + cfg.model + " \xB7 " + cfg.computeType + " \xB7 " + cfg.languageLabel + " \xB7 " + cfg.recordSeconds + "s", "normal");
    });
  });
  bind("coreSendBtn", () => sendNoelleCoreMessage());
  bind("coreMicBtn", () => startNoelleCoreVoiceInput());
  bind("coreSttStopBtn", () => stopNoelleCoreVoiceInput());
  bind("coreSttStatusBtn", () => {
    const cfg = getNoelleAudioSttConfig();
    const hasApi = !!window.desktopWidget?.noelleCoreTranscribeAudio;
    const sttStatusMessage = hasApi ? [
      "STT local pronto para chamar o faster-whisper.",
      "Modelo: " + cfg.model,
      "Compute: " + cfg.computeType,
      "Idioma: " + cfg.languageLabel,
      "Grava\xE7\xE3o: " + cfg.recordSeconds + "s",
      "Se for o primeiro uso, o modelo pode baixar/cachear."
    ].join("\n") : "STT local n\xE3o est\xE1 exposto no preload. Aplique o patch completo e rode PREPARAR_AUDIO_STT.bat.";
    pushNoelleCoreMessage("system", sttStatusMessage);
    setNoelleCoreRuntimeLine(hasApi ? "STT configurado." : "STT indispon\xEDvel no preload.", hasApi ? "ok" : "error");
  });
  setNoelleMicState("idle", "\u{1F399}");
  const input = byId2("coreChatInput");
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
    pushNoelleCoreMessage(
      "system",
      status?.ollamaOnline ? `Status OK. Modelo ativo: ${status.activeModel}. Perfil: ${status.activeProfile}.` : `Ollama offline ou indispon\xEDvel. ${status?.ollamaError || status?.error || ""}`.trim()
    );
  });
  bind("corePreloadBtn", async () => {
    setNoelleCoreBusy(true, "Enviar");
    setNoelleCoreRuntimeLine("Pr\xE9-carregando modelo no Ollama...", "busy");
    const result = await window.desktopWidget?.noelleCorePreload?.();
    pushNoelleCoreMessage(
      "system",
      result?.ok ? "Modelo pr\xE9-carregado: " + result.model + "." : "Falha ao pr\xE9-carregar: " + (result?.error || "erro desconhecido") + (result?.hint ? "\n" + result.hint : "")
    );
    setNoelleCoreRuntimeLine(result?.ok ? "Modelo pr\xE9-carregado. A pr\xF3xima resposta tende a ser mais r\xE1pida." : result?.hint || "Falha ao pr\xE9-carregar.", result?.ok ? "ok" : "error");
    await refreshNoelleCoreStatus();
    setNoelleCoreBusy(false);
  });
  bind("coreUnloadBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreUnload?.();
    pushNoelleCoreMessage(
      "system",
      result?.ok ? "Modelo descarregado da RAM: " + result.model + "." : "Falha ao descarregar: " + (result?.error || "erro desconhecido")
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
    const inputText = String(byId2("coreChatInput")?.value || "").trim();
    if (!inputText) {
      pushNoelleCoreMessage("system", "Digite algo no campo de mensagem para salvar como mem\xF3ria.");
      return;
    }
    const result = await window.desktopWidget?.noelleCoreRemember?.(inputText);
    pushNoelleCoreMessage("system", result?.ok ? "Mem\xF3ria salva." : "Falha ao salvar mem\xF3ria: " + (result?.error || "erro desconhecido"));
  });
  bind("coreMemoriesBtn", async () => {
    await showNoelleCoreMemories();
  });
  bind("coreForgetMemoryBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreForgetMemory?.("last");
    pushNoelleCoreMessage(
      "system",
      result?.ok ? "\xDAltima mem\xF3ria apagada: " + (result.removed?.text || "item") + "." : "Falha ao apagar mem\xF3ria: " + (result?.error || "erro desconhecido")
    );
  });
  bind("coreClearMemoriesBtn", async () => {
    const result = await window.desktopWidget?.noelleCoreClearMemories?.();
    pushNoelleCoreMessage(
      "system",
      result?.ok ? "Todas as mem\xF3rias da NoelleCore foram apagadas." : "Falha ao limpar mem\xF3rias: " + (result?.error || "erro desconhecido")
    );
  });
  bind("coreDiagnosticBtn", async () => {
    setNoelleCoreRuntimeLine("Rodando diagn\xF3stico do NoelleCore...", "busy");
    const result = await window.desktopWidget?.noelleCoreDiagnostic?.();
    setNoelleCoreStatusLine(result);
    pushNoelleCoreMessage("system", formatNoelleCoreDiagnostic(result));
    setNoelleCoreRuntimeLine(result?.ok ? "Diagn\xF3stico conclu\xEDdo." : "Diagn\xF3stico falhou.", result?.ok ? "ok" : "error");
  });
  bind("coreBenchBtn", async () => {
    setNoelleCoreBusy(true, "Enviar");
    setNoelleCoreRuntimeLine("Rodando bench curto do modelo ativo...", "busy");
    try {
      const result = await window.desktopWidget?.noelleCoreBench?.();
      if (result?.ok) {
        const metrics = formatNoelleCoreMetrics(result.metrics);
        pushNoelleCoreMessage("system", "Bench OK: " + result.seconds + "s com " + result.model + "." + (metrics ? "\n" + metrics : ""));
        setNoelleCoreRuntimeLine("Bench conclu\xEDdo em " + result.seconds + "s" + (metrics ? " \xB7 " + metrics : "") + ".", "ok");
      } else {
        pushNoelleCoreMessage("system", "Bench falhou: " + (result?.error || "erro desconhecido") + (result?.hint ? "\n" + result.hint : ""));
        setNoelleCoreRuntimeLine(result?.hint || "Bench falhou.", "error");
      }
      await refreshNoelleCoreStatus();
    } finally {
      setNoelleCoreBusy(false);
    }
  });
  const modelSelect = byId2("coreModelSelect");
  if (modelSelect) {
    modelSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetModel?.(modelSelect.value);
      pushNoelleCoreMessage(
        "system",
        result?.ok ? "Modelo ativo agora: " + result.activeModel + "." : "Falha ao trocar modelo: " + (result?.error || "erro desconhecido")
      );
      setNoelleCoreRuntimeLine(result?.ok ? "Modelo trocado. Use Pr\xE9-carregar para reduzir a primeira demora." : "Falha ao trocar modelo.", result?.ok ? "ok" : "error");
      await refreshNoelleCoreStatus();
    });
  }
  const profileSelect = byId2("coreProfileSelect");
  if (profileSelect) {
    profileSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetProfile?.(profileSelect.value);
      pushNoelleCoreMessage(
        "system",
        result?.ok ? "Perfil ativo agora: " + (result.activeProfileLabel || result.activeProfile) + "." : "Falha ao trocar perfil: " + (result?.error || "erro desconhecido")
      );
      setNoelleCoreRuntimeLine(result?.ok ? "Perfil atualizado." : "Falha ao trocar perfil.", result?.ok ? "ok" : "error");
      await refreshNoelleCoreStatus();
    });
  }
  const personaSelect = byId2("corePersonaSelect");
  if (personaSelect) {
    personaSelect.addEventListener("change", async () => {
      const result = await window.desktopWidget?.noelleCoreSetPersona?.(personaSelect.value);
      pushNoelleCoreMessage(
        "system",
        result?.ok ? "Persona ativa agora: " + (result.activePersonaLabel || result.activePersona) + "." : "Falha ao trocar persona: " + (result?.error || "erro desconhecido")
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
  bind("sizeSmallBtn", () => {
    setSizeButtonState("sizeSmallBtn");
    window.desktopWidget?.setAvatarWindowSize("small");
  });
  bind("sizeMediumBtn", () => {
    setSizeButtonState("sizeMediumBtn");
    window.desktopWidget?.setAvatarWindowSize("medium");
  });
  bind("sizeLargeBtn", () => {
    setSizeButtonState("sizeLargeBtn");
    window.desktopWidget?.setAvatarWindowSize("large");
  });
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
    setPresetIoStatus("Ajustes resetados para o padr\xE3o.");
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
  ["spawnXRange", "spawnYRange", "defaultScaleRange", "frameOffsetXRange", "frameOffsetYRange"].forEach((id) => {
    const el = byId2(id);
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
    setPresetIoStatus("Rota\xE7\xE3o do avatar resetada.");
  });
  bind("saveAvatarViewBtn", () => {
    applyTuningFromControls({ live: false });
    window.desktopWidget?.sendAvatarCommand({ type: "centerAvatar" });
    setPresetIoStatus("Posi\xE7\xE3o/escala do avatar salvas para este avatar.");
  });
  bind("resetUiPrefsBtn", () => {
    saveUiPrefs({ ...DEFAULT_UI_PREFS, theme: "noelle_classic" });
    localStorage.removeItem("noelle_equipped_items");
    syncUiPrefControls();
    applyUiPrefsFromControls();
    setPresetIoStatus("Interface resetada.");
  });
  bind("copyDiagnosticBtn", () => copyDiagnostic());
  ["themeSelect", "performanceModeSelect", "reducedTransparencyToggle", "expressionOverlayToggle", "autoCenterOnPresetToggle"].forEach((id) => {
    const el = byId2(id);
    if (el) {
      el.addEventListener("change", () => applyUiPrefsFromControls());
    }
  });
  bind("exportPresetBtn", async () => {
    try {
      const snapshot = getCurrentPresetSnapshot();
      const result = await savePresetWithFallback(snapshot);
      setPresetIoStatus(result.mode === "native" ? "Preset exportado via di\xE1logo nativo." : "Preset exportado com fallback do navegador.");
    } catch (err) {
      setPresetIoStatus("Falha ao exportar preset: " + err);
    }
  });
  bind("importPresetBtn", async () => {
    try {
      const result = await openPresetWithFallback();
      if (!result.ok || !result.text) {
        setPresetIoStatus("Importa\xE7\xE3o cancelada.");
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
      await window.desktopWidget?.setThemeSourceNative?.(applied.uiPrefs.theme === "light" ? "light" : applied.uiPrefs.theme === "system" ? "system" : "dark");
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
      setPresetIoStatus(result.mode === "native" ? "Preset importado via di\xE1logo nativo." : "Preset importado com fallback do navegador.");
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
  }, 5e3);
  setDiagnosticStatus("Pr\xE9-release pronto para testes.");
}
main().catch((err) => {
  const summary = byId2("windowSummary");
  if (summary) summary.textContent = "Erro ao iniciar controles: " + err;
  console.error(err);
});
(function() {
  try {
    if (!window.__NOELLE_CHAT_FORCE_FIX_V7_SCRIPT_TAG__) {
      window.__NOELLE_CHAT_FORCE_FIX_V7_SCRIPT_TAG__ = true;
      setTimeout(function() {
        if (document.querySelector("script[data-noelle-chat-force-fix-v7]")) return;
        var s = document.createElement("script");
        s.type = "module";
        s.dataset.noelleChatForceFixV7 = "1";
        s.src = "./renderer/noelle_chat_v8_modern.js?v=8";
        (document.head || document.documentElement).appendChild(s);
      }, 350);
    }
  } catch (_) {
  }
})();
(function() {
  try {
    setTimeout(function() {
      if (document.querySelector("script[data-noelle-chat-v8-modern]")) return;
      var s = document.createElement("script");
      s.dataset.noelleChatV8Modern = "1";
      s.src = "./renderer/noelle_chat_v8_modern.js?v=8";
      (document.head || document.documentElement).appendChild(s);
    }, 250);
  } catch (_) {
  }
})();
