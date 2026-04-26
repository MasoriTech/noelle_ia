function byId(id) {
  return document.getElementById(id);
}

const MOTION_THUMBS = [
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

export function buildMotionCarousel(motions, onSelect) {
  const tracks = [
    byId("motionCarouselTrack"),
    byId("motionCarouselTrackAlt")
  ].filter(Boolean);

  tracks.forEach((track) => renderMotionTrack(track, motions, onSelect));

  const bindings = [
    ["motionCarouselTrack", "motionPrevBtn", "motionNextBtn"],
    ["motionCarouselTrackAlt", "motionPrevBtnAlt", "motionNextBtnAlt"],
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
    const equippedText = equippedSlot ? `<div class="inventory-equipped">✓ ${manager.slotLabel(equippedSlot)}</div>` : "";
    card.innerHTML = `
      <div class="inventory-thumb">${thumb ? `<img src="${thumb}" alt="${item.label}">` : "📦"}</div>
      <div class="inventory-name">${item.label}</div>
      <div class="inventory-slot">${equippedSlot ? manager.slotLabel(equippedSlot) : item.slot}</div>
      ${equippedText}
    `;
    card.addEventListener("click", (event) => onOpenMenu(item, card, event));
    grid.appendChild(card);
  });
}

export function buildInventoryGrid(items, manager, onOpenMenu) {
  const grids = [
    byId("inventoryGrid"),
    byId("inventoryGridAlt")
  ].filter(Boolean);

  grids.forEach((grid) => renderInventoryGrid(grid, items, manager, onOpenMenu));
}

export function openItemMenu(cardEl, _item, actions, onChoose) {
  const menu = byId("itemMenu");
  if (!menu || !cardEl) return;
  menu.innerHTML = "";
  const rect = cardEl.getBoundingClientRect();

  actions.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = "context-item";

    const icon = document.createElement("span");
    icon.className = "context-icon";
    icon.textContent =
      entry.actionType === "unequip" || entry.label.toLowerCase().includes("desequipar") ? "⛔" :
      entry.label.toLowerCase().includes("direita") ? "👉" :
      entry.label.toLowerCase().includes("esquerda") ? "👈" :
      entry.label.toLowerCase().includes("duas mãos") ? "🙌" :
      entry.label.toLowerCase().includes("costas") ? "🎒" :
      entry.label.toLowerCase().includes("cena") ? "🖼" : "✨";

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

export function closeItemMenu() {
  const menu = byId("itemMenu");
  if (menu) menu.classList.remove("open");
}

export function updateEquippedSummary(manager) {
  const el = byId("inventorySummary");
  if (!el) return;
  manager.syncFromStorage?.();
  const summary = [];
  for (const [slot, entry] of Object.entries(manager.equipped || {})) {
    if (entry?.item) summary.push(`${manager.slotLabel(slot)}: ${entry.item.label}`);
  }
  el.textContent = summary.length ? summary.join(" • ") : "Nenhum item equipado";
}
