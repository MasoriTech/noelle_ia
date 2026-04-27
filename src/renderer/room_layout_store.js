export const DEFAULT_ROOM_LAYOUT = {
  version: 1,
  roomId: "default_room",
  grid: { size: 0.25, enabled: true },
  items: []
};

export const DEFAULT_ROOM_PRESETS = [
  {
    id: "clean_office",
    label: "Escritório limpo",
    description: "Mesa central com espaço para adicionar props.",
    items: [
      { uid: "office_desk_preset_001", itemId: "office_desk", position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1], locked: false }
    ]
  },
  {
    id: "music_corner",
    label: "Canto musical",
    description: "Piano levemente à direita e mesa separada.",
    items: [
      { uid: "grand_piano_preset_001", itemId: "grand_piano", position: [1.25, 0, -0.75], rotationDeg: [0, -25, 0], scale: [1, 1, 1], locked: false },
      { uid: "office_desk_preset_002", itemId: "office_desk", position: [-1.1, 0, 0.25], rotationDeg: [0, 10, 0], scale: [1, 1, 1], locked: false }
    ]
  }
];

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeVec3(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return [finite(value[0], fallback[0]), finite(value[1], fallback[1]), finite(value[2], fallback[2])];
}

export function safeLayout(layout) {
  return {
    version: 1,
    roomId: String(layout?.roomId || "default_room").replace(/[^a-zA-Z0-9_-]/g, "_"),
    grid: layout?.grid || DEFAULT_ROOM_LAYOUT.grid,
    items: Array.isArray(layout?.items) ? layout.items.map((item) => ({
      uid: String(item.uid || "").slice(0, 100),
      itemId: String(item.itemId || "").slice(0, 100),
      position: safeVec3(item.position, [0, 0, 0]),
      rotationDeg: safeVec3(item.rotationDeg, [0, 0, 0]),
      scale: safeVec3(item.scale, [1, 1, 1]).map((v) => Math.max(0.001, v)),
      locked: !!item.locked
    })).filter((item) => item.uid && item.itemId) : []
  };
}

export async function loadRoomLayout() {
  if (window.noelleRoom?.loadLayout) {
    const result = await window.noelleRoom.loadLayout();
    if (result?.ok) return safeLayout(result.layout || DEFAULT_ROOM_LAYOUT);
  }

  try {
    const res = await fetch("./assets/room_layout.json");
    if (!res.ok) return structuredClone(DEFAULT_ROOM_LAYOUT);
    return safeLayout(await res.json());
  } catch {
    return structuredClone(DEFAULT_ROOM_LAYOUT);
  }
}

export async function saveRoomLayout(layout) {
  const safe = safeLayout(layout);

  if (window.noelleRoom?.saveLayout) {
    return window.noelleRoom.saveLayout(safe);
  }

  localStorage.setItem("noelle_room_layout", JSON.stringify(safe));
  return { ok: true, layout: safe, localOnly: true };
}

export function presetToLayout(preset) {
  return safeLayout({
    version: 1,
    roomId: preset?.id || "preset_room",
    grid: DEFAULT_ROOM_LAYOUT.grid,
    items: Array.isArray(preset?.items) ? preset.items : []
  });
}
