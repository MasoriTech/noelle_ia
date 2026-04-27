const PURE_AVATAR_CATEGORIES = new Set(["hand", "avatar_item", "hand_prop", "wearable"]);
const ROOM_CATEGORY_BY_ID = [
  [/piano|grand_piano/i, "furniture"],
  [/desk|mesa|table|chair|cadeira|bed|sofa|shelf|estante/i, "furniture"],
  [/monitor|tablet|phone|iphone|computer|pc|keyboard/i, "electronics"],
  [/lamp|light|plant|decor|poster|frame/i, "decor"],
  [/dado|dice|cafe|cup|book|paper/i, "table_prop"]
];

function inferCategory(item) {
  const hay = `${item.id || ""} ${item.label || ""} ${item.file || ""} ${item.category || ""}`;
  for (const [regex, category] of ROOM_CATEGORY_BY_ID) {
    if (regex.test(hay)) return category;
  }
  if (String(item.category || "").includes("scene")) return "furniture";
  return item.category || "floor_prop";
}

function canAppearInRoom(item) {
  const kind = String(item.kind || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const roomMode = item.allowInRoom || item.room === true || item.kind === "room_item";
  const dual = item.dualUse === true || item.roomUse === true;
  const hay = `${item.id || ""} ${item.label || ""} ${item.file || ""} ${category} ${kind}`.toLowerCase();
  const looksRoom = /desk|piano|chair|cadeira|mesa|table|bed|sofa|monitor|lamp|shelf|estante|dado|dice|tablet|book|paper/.test(hay);

  if (kind === "room_item" || kind === "scene_prop") return true;
  if (category === "scene_prop" || category === "furniture") return true;
  if (roomMode || dual || looksRoom) return true;
  if (PURE_AVATAR_CATEGORIES.has(category) || PURE_AVATAR_CATEGORIES.has(kind)) return false;
  return false;
}

function normalizeCatalogItem(item) {
  const file = String(item.file || item.path || "");
  const id = String(item.id || file.split("/").pop()?.replace(/\.[^.]+$/, "") || "item");
  const category = inferCategory({ ...item, id, file });
  return {
    id,
    label: item.label || item.title || id,
    file,
    category,
    kind: "room_item",
    allowInRoom: true,
    placement: {
      surface: category === "table_prop" ? "table" : "floor",
      snap: category !== "decor",
      rotateStepDeg: 15,
      canCollide: category === "furniture",
      targetSize: item.targetSize || item.target_size || item.placement?.targetSize || (category === "table_prop" ? 0.18 : 1),
      ...(item.placement || {})
    },
    raw: item
  };
}

export async function loadRoomCatalog() {
  let list = [];
  if (window.noelleRoom?.listCatalog) {
    const result = await window.noelleRoom.listCatalog();
    if (result?.ok && Array.isArray(result.items)) list = result.items;
  }

  if (!list.length) {
    const res = await fetch("./assets/room_manifest.json");
    const data = await res.json();
    list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  }

  return list.filter(canAppearInRoom).map(normalizeCatalogItem);
}

export function filterCatalogForRoom(items, category = "all", query = "") {
  const cleanQuery = String(query || "").toLowerCase();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const okCategory = category === "all" || item.category === category;
    const okQuery = !cleanQuery || `${item.id} ${item.label} ${item.category} ${item.file}`.toLowerCase().includes(cleanQuery);
    return okCategory && okQuery;
  });
}

export function groupCatalogCounts(items) {
  const counts = {};
  for (const item of Array.isArray(items) ? items : []) counts[item.category] = (counts[item.category] || 0) + 1;
  return counts;
}
