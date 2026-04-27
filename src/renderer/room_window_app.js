import { createRoomScene } from "./room_scene.js";
import { loadRoomCatalog, filterCatalogForRoom } from "./room_catalog.js";
import { createRoomItemManager } from "./room_items.js";
import { loadRoomLayout, saveRoomLayout } from "./room_layout_store.js";
import { createRoomControls } from "./room_controls.js";

const $ = (id) => document.getElementById(id);

let catalog = [];
let layout = null;
let manager = null;
let sceneApi = null;
let controlsApi = null;

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function setStatus(message) {
  const el = $("statusPill");
  if (el) el.textContent = message;
}

function renderCatalog() {
  const list = $("catalogList");
  const query = String($("catalogSearch")?.value || "").toLowerCase();
  if (!list) return;
  const filtered = catalog.filter((item) => `${item.id} ${item.label} ${item.category}`.toLowerCase().includes(query));
  list.innerHTML = "";

  if (!filtered.length) {
    list.innerHTML = `<div class="catalog-item"><strong>Nenhum item</strong><small>Sem room_item no catálogo.</small></div>`;
    return;
  }

  for (const item of filtered) {
    const card = document.createElement("div");
    card.className = "catalog-item";
    card.innerHTML = `
      <strong>${item.label || item.id}</strong>
      <small>${item.file || ""}</small>
      <span class="badge">${item.category || "room_item"}</span>
      <button data-add="${item.id}" class="primary">Adicionar</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      try {
        await manager.addItem(item, item.placement || {});
        renderLayoutList();
        updateInspector();
      } catch (err) {
        console.error(err);
        toast("Falha ao adicionar: " + (err?.message || err));
      }
    });
    list.appendChild(card);
  }
}

function renderLayoutList() {
  const list = $("layoutList");
  if (!list || !manager) return;
  const items = [...manager.placed.values()];
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="layout-item"><strong>Room vazia</strong><small>Adicione móveis pelo catálogo.</small></div>`;
    return;
  }

  for (const entry of items) {
    const card = document.createElement("div");
    card.className = "layout-item";
    card.innerHTML = `
      <strong>${entry.item.label || entry.item.id}</strong>
      <small>${entry.uid}${entry.locked ? " · travado" : ""}</small>
      <button data-select="${entry.uid}">Selecionar</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      manager.select(entry.uid);
      updateInspector(true);
    });
    list.appendChild(card);
  }
}

function selectedTransform() {
  const entry = manager?.getSelected();
  if (!entry) return null;
  return { entry, position: entry.object.position, rotation: entry.object.rotation, scale: entry.object.scale };
}

function renderValidation(result) {
  const box = $("validationBox");
  if (!box) return;
  const errors = result?.errors || [];
  const warnings = result?.warnings || [];
  box.className = "validation-box " + (errors.length ? "error" : warnings.length ? "warn" : "ok");
  if (!errors.length && !warnings.length) {
    box.textContent = "OK · item dentro da Room.";
    return;
  }
  box.innerHTML = [...errors, ...warnings].map((msg) => `• ${msg}`).join("<br>");
}

function updateInspector(focus = false) {
  const info = $("selectedInfo");
  const selected = selectedTransform();
  if (!selected) {
    if (info) info.textContent = "Nenhum item selecionado.";
    renderValidation({ ok: true, errors: [], warnings: [] });
    for (const id of ["posX", "posY", "posZ", "rotY", "scaleAll"]) {
      const input = $(id);
      if (input) input.value = "";
    }
    return;
  }

  const { entry, position, rotation, scale } = selected;
  const baseScale = Number(entry.object.userData?.noelleRoom?.baseScale || 1);
  const userScale = baseScale ? scale.x / baseScale : scale.x;

  if (info) {
    info.innerHTML = `
      <b>${entry.item.label || entry.item.id}</b><br>
      UID: ${entry.uid}<br>
      Room item · ${entry.locked ? "travado" : "editável"}
    `;
  }

  $("posX").value = position.x.toFixed(2);
  $("posY").value = position.y.toFixed(2);
  $("posZ").value = position.z.toFixed(2);
  $("rotY").value = (rotation.y * 180 / Math.PI).toFixed(1);
  $("scaleAll").value = userScale.toFixed(2);

  renderValidation(manager.validateSelected());

  if (focus && sceneApi?.controls) {
    sceneApi.controls.target.copy(position);
  }
}

async function saveCurrentLayout() {
  const current = {
    version: 1,
    roomId: "default_room",
    grid: layout?.grid || { size: 0.25, enabled: true },
    items: manager.serialize()
  };
  const result = await saveRoomLayout(current);
  if (result?.ok) toast("Room salva");
  else toast("Falha ao salvar Room");
}

async function loadCurrentLayout() {
  layout = await loadRoomLayout();
  await manager.loadLayout(layout, catalog);
  renderLayoutList();
  updateInspector();
  toast("Room carregada");
}

function setMode(mode) {
  manager.setMode(mode);
  for (const id of ["btnModeMove", "btnModeRotate", "btnModeScale"]) $(id)?.classList.remove("active");
  if (mode === "translate") $("btnModeMove")?.classList.add("active");
  if (mode === "rotate") $("btnModeRotate")?.classList.add("active");
  if (mode === "scale") $("btnModeScale")?.classList.add("active");
}

function bindUi() {
  $("catalogSearch")?.addEventListener("input", renderCatalog);
  $("btnSave")?.addEventListener("click", saveCurrentLayout);
  $("btnLoad")?.addEventListener("click", loadCurrentLayout);
  $("btnGrid")?.addEventListener("click", () => controlsApi?.toggleGrid());
  $("btnCollision")?.addEventListener("click", () => controlsApi?.toggleCollision());
  $("btnFocus")?.addEventListener("click", () => updateInspector(true));
  $("btnRemove")?.addEventListener("click", () => { manager.remove(); renderLayoutList(); updateInspector(); });
  $("btnDuplicate")?.addEventListener("click", async () => { await manager.duplicate(); renderLayoutList(); updateInspector(); });
  $("btnReset")?.addEventListener("click", async () => { await manager.resetSelected(); renderLayoutList(); updateInspector(); });
  $("btnLock")?.addEventListener("click", () => { manager.toggleLock(); renderLayoutList(); updateInspector(); });
  $("btnModeMove")?.addEventListener("click", () => setMode("translate"));
  $("btnModeRotate")?.addEventListener("click", () => setMode("rotate"));
  $("btnModeScale")?.addEventListener("click", () => setMode("scale"));

  $("btnApplyTransform")?.addEventListener("click", () => {
    const x = Number($("posX").value || 0);
    const y = Number($("posY").value || 0);
    const z = Number($("posZ").value || 0);
    const ry = Number($("rotY").value || 0);
    const s = Number($("scaleAll").value || 1);
    manager.setSelectedTransform({ position: [x, y, z], rotationDeg: [0, ry, 0], scale: [s, s, s] });
    renderLayoutList();
    updateInspector();
  });
}

async function init() {
  try {
    setStatus("Criando cena...");
    sceneApi = createRoomScene($("roomCanvas"));

    setStatus("Carregando catálogo...");
    catalog = filterCatalogForRoom(await loadRoomCatalog());

    manager = createRoomItemManager({
      ...sceneApi,
      gridSize: 0.25,
      toast,
      onValidate: renderValidation
    });

    setStatus("Carregando layout...");
    layout = await loadRoomLayout();
    await manager.loadLayout(layout, catalog);

    controlsApi = createRoomControls({ manager, renderLayoutList, updateInspector, saveLayout: saveCurrentLayout, toast, grid: sceneApi.grid });

    bindUi();
    setMode("translate");
    renderCatalog();
    renderLayoutList();
    updateInspector();
    setStatus("Room pronta");
    toast("Room pronta");
  } catch (err) {
    console.error(err);
    setStatus("Falha na Room");
    toast("Falha: " + (err?.message || err));
  }
}

window.addEventListener("beforeunload", () => {
  try { manager?.dispose?.(); sceneApi?.dispose?.(); } catch {}
});

window.addEventListener("DOMContentLoaded", init);
