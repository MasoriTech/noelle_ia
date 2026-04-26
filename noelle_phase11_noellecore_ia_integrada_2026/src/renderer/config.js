export const AVATAR_CONFIG = {
  minScale: 0.60,
  maxScale: 1.70,
  defaultScale: 0.89,

  spawnX: 0.00,
  spawnY: -0.37,
  spawnZ: 0.00,

  frameOffsetX: 0.00,
  frameOffsetY: 0.06,

  idleFloatAmount: 0.004,
};

export const AVATAR_TUNING_SCHEMA_VERSION = 3;

export const DEFAULT_AVATAR_TUNING = {
  spawnX: AVATAR_CONFIG.spawnX,
  spawnY: AVATAR_CONFIG.spawnY,
  spawnZ: AVATAR_CONFIG.spawnZ,
  defaultScale: AVATAR_CONFIG.defaultScale,
  frameOffsetX: AVATAR_CONFIG.frameOffsetX,
  frameOffsetY: AVATAR_CONFIG.frameOffsetY,
  rotationY: 0,
  __version: AVATAR_TUNING_SCHEMA_VERSION,
};

export const DEFAULT_UI_PREFS = {
  theme: "noelle_classic",
  reducedTransparency: false,
  performanceMode: "balanced",
  expressionOverlay: true,
  autoCenterOnPreset: true,
};

export const AVATAR_WINDOW_CONFIG = {
  defaultWidth: 420,
  defaultHeight: 730,
  minWidth: 340,
  minHeight: 620,
  rightMargin: 24,
  topRatio: 0.06,
  alwaysOnTopDefault: false,
};

export const CONTROLS_WINDOW_CONFIG = {
  defaultWidth: 820,
  defaultHeight: 730,
  minWidth: 680,
  minHeight: 620,
  leftMargin: 28,
  topRatio: 0.06,
};

export const CAMERA_PRESETS = {
  face: { x: 0.00, y: 1.74, z: 1.08, scale: 1.10, targetX: 0.00, targetY: 1.55, label: "Rosto" },
  bust: { x: 0.00, y: 1.58, z: 1.48, scale: 0.94, targetX: 0.00, targetY: 1.26, label: "Busto" },
  half: { x: 0.00, y: 1.48, z: 2.20, scale: 0.82, targetX: 0.00, targetY: 0.96, label: "Meio corpo" },
  full: { x: 0.00, y: 1.62, z: 4.25, scale: 0.89, targetX: 0.00, targetY: 0.46, label: "Corpo inteiro" },
};

export const SLOT_LABELS = {
  right_hand: "Mão direita",
  left_hand: "Mão esquerda",
  back_mount: "Costas",
  head: "Cabeça",
  waist: "Cintura",
  scene_front: "Cena",
  two_hands: "Duas mãos"
};

export function loadAvatarTuning() {
  try {
    const raw = localStorage.getItem("noelle_avatar_tuning");
    if (!raw) {
      localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
      return { ...DEFAULT_AVATAR_TUNING };
    }
    const parsed = JSON.parse(raw);
    if (parsed?.__version !== AVATAR_TUNING_SCHEMA_VERSION) {
      // Fase de polimento: ignora tuning antigo que deixava o avatar desalinhado ao iniciar.
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

export function saveAvatarTuning(tuning) {
  const merged = { ...DEFAULT_AVATAR_TUNING, ...(tuning || {}), __version: AVATAR_TUNING_SCHEMA_VERSION };
  localStorage.setItem("noelle_avatar_tuning", JSON.stringify(merged));
  return merged;
}

export function loadUiPrefs() {
  try {
    const raw = localStorage.getItem("noelle_ui_prefs");
    if (!raw) return { ...DEFAULT_UI_PREFS };
    return { ...DEFAULT_UI_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export function saveUiPrefs(nextPrefs) {
  const merged = { ...DEFAULT_UI_PREFS, ...(nextPrefs || {}) };
  localStorage.setItem("noelle_ui_prefs", JSON.stringify(merged));
  return merged;
}
