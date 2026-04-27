function normalizeCatalogItem(item) {
  const file = String(item.file || item.path || "");
  const id = String(item.id || file.split("/").pop()?.replace(/\.[^.]+$/, "") || "item");
  const kind = item.kind || (item.category === "scene_prop" ? "room_item" : item.kind) || "room_item";
  return {
    id,
    label: item.label || item.title || id,
    file,
    category: item.category || "room_item",
    kind,
    placement: {
      surface: "floor",
      snap: true,
      rotateStepDeg: 15,
      canCollide: true,
      targetSize: item.targetSize || item.target_size || 1,
      ...(item.placement || {})
    },
    raw: item
  };
}

export async function loadRoomCatalog() {
  if (window.noelleRoom?.listCatalog) {
    const result = await window.noelleRoom.listCatalog();
    if (result?.ok && Array.isArray(result.items)) return result.items.map(normalizeCatalogItem);
  }

  const res = await fetch("./assets/room_manifest.json");
  const data = await res.json();
  const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  return list.map(normalizeCatalogItem);
}

export function filterCatalogForRoom(items) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = String(item.id || "").toLowerCase();
    const file = String(item.file || "").toLowerCase();
    const kind = String(item.kind || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    const hay = id + " " + file + " " + kind + " " + category;
    return (
      kind === "room_item" ||
      kind === "scene_prop" ||
      category.includes("scene") ||
      category.includes("furniture") ||
      /desk|piano|chair|cadeira|mesa|table|bed|sofa|monitor|lamp|shelf|estante/.test(hay)
    );
  });
}
