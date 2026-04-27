import { createRoomScene } from "./room_scene.js";
import { loadRoomCatalog, filterCatalogForRoom, groupCatalogCounts } from "./room_catalog.js";
import { createRoomItemManager } from "./room_items.js";
import { loadRoomLayout, saveRoomLayout, DEFAULT_ROOM_PRESETS, presetToLayout, safeLayout } from "./room_layout_store.js";
import { createRoomControls } from "./room_controls.js";
import { createRoomHistory } from "./room_history.js";
import { createAutosaveScheduler, loadRoomAutosave, clearRoomAutosave } from "./room_autosave.js";

const $ = (id) => document.getElementById(id);

let catalog = [];
let layout = null;
let manager = null;
let sceneApi = null;
let controlsApi = null;
let historyApi = null;
let autosaveApi = null;
let suppressHistory = false;

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

function setSafety(message, type = "ok") {
  const el = $("safetyBox");
  if (!el) return;
  el.className = `validation-box ${type}`;
  el.textContent = message;
}

function currentLayout() {
  return safeLayout({
    version: 1,
    roomId: "default_room",
    grid: layout?.grid || { size: 0.25, enabled: true },
    items: manager?.serialize?.() || []
  });
}

function renderCatalog() {
  const list = $("catalogList");
  const category = $("categoryFilter")?.value || "all";
  const query = $("catalogSearch")?.value || "";
  if (!list) return;
  const filtered = filterCatalogForRoom(catalog, category, query);
  list.innerHTML = "";

  if (!filtered.length) {
    list.innerHTML = `<div class="catalog-item"><strong>Nenhum item</strong><small>Sem room_item nesta categoria.</small></div>`;
    return;
  }

  for (const item of filtered) {
    const card = document.createElement("div");
    card.className = "catalog-item";
    card.innerHTML = `
      <strong>${item.label || item.id}</strong>
      <small>${item.file || ""}</small>
      <span class="badge">${item.category || "room_item"}</span>
      ${item.raw?.dualUse ? '<span class="badge warn">dual</span>' : ''}
      <button data-add="${item.id}" class="primary">Adicionar</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      try {
        await manager.addItem(item, item.placement || {});
        commitRoomChange("add");
      } catch (err) {
        console.error(err);
        toast("Falha ao adicionar: " + (err?.message || err));
      }
    });
    list.appendChild(card);
  }
}

function renderPresetList() {
  const list = $("presetList");
  if (!list) return;
  list.innerHTML = "";
  for (const preset of DEFAULT_ROOM_PRESETS) {
    const card = document.createElement("div");
    card.className = "preset-item";
    card.innerHTML = `
      <strong>${preset.label}</strong>
      <small>${preset.description || ""}</small>
      <button class="primary">Aplicar preset</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      const presetLayout = presetToLayout(preset);
      await manager.loadLayout(presetLayout, catalog);
      commitRoomChange(`preset:${preset.id}`);
      toast(`Preset aplicado: ${preset.label}`);
    });
    list.appendChild(card);
  }
}

function updateCategoryLabels() {
  const counts = groupCatalogCounts(catalog);
  const select = $("categoryFilter");
  if (!select) return;
  for (const option of select.options) {
    if (option.value === "all") option.textContent = `Todas categorias (${catalog.length})`;
    else option.textContent = `${option.textContent.replace(/\s*\(.+\)$/, "")} (${counts[option.value] || 0})`;
  }
}

function renderLayoutList() {
  const list = $("layoutList");
  if (!list || !manager) return;
  const items = [...manager.placed.values()];
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="layout-item"><strong>Room vazia</strong><small>Adicione móveis pelo catálogo ou use um preset.</small></div>`;
    return;
  }

  for (const entry of items) {
    const card = document.createElement("div");
    card.className = "layout-item";
    card.innerHTML = `
      <strong>${entry.item.label || entry.item.id}</strong>
      <small>${entry.uid}${entry.locked ? " · travado" : ""}${entry.object.userData?.noelleMissingAsset ? " · placeholder" : ""}</small>
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
      ${entry.item.category || "room_item"} · ${entry.locked ? "travado" : "editável"}
      ${entry.object.userData?.noelleMissingAsset ? "<br><b>placeholder:</b> asset não carregou" : ""}
    `;
  }

  $("posX").value = position.x.toFixed(2);
  $("posY").value = position.y.toFixed(2);
  $("posZ").value = position.z.toFixed(2);
  $("rotY").value = (rotation.y * 180 / Math.PI).toFixed(1);
  $("scaleAll").value = userScale.toFixed(2);

  renderValidation(manager.validateSelected());

  if (focus && sceneApi?.focusOnObject) sceneApi.focusOnObject(entry.object);
}

function updateHistoryButtons(state = historyApi?.state?.()) {
  $("btnUndo") && ($("btnUndo").disabled = !state?.canUndo);
  $("btnRedo") && ($("btnRedo").disabled = !state?.canRedo);
}

function commitRoomChange(label = "change") {
  renderLayoutList();
  updateInspector();
  autosaveApi?.schedule();
  if (!suppressHistory) historyApi?.push(label);
}

async function saveCurrentLayout() {
  autosaveApi?.flush();
  const result = await saveRoomLayout(currentLayout());
  if (result?.ok) {
    clearRoomAutosave();
    setSafety("Salvo. Autosave limpo.", "ok");
    toast("Room salva");
  } else {
    setSafety("Falha ao salvar. Autosave mantido.", "warn");
    toast("Falha ao salvar Room");
  }
}

async function loadCurrentLayout() {
  layout = await loadRoomLayout();
  suppressHistory = true;
  await manager.loadLayout(layout, catalog);
  suppressHistory = false;
  historyApi?.reset(currentLayout());
  renderLayoutList();
  updateInspector();
  autosaveApi?.schedule();
  toast("Room carregada");
}

async function recoverAutosave() {
  const result = loadRoomAutosave();
  if (!result.ok) {
    toast("Nenhum autosave encontrado");
    setSafety("Nenhum autosave encontrado.", "warn");
    return;
  }
  suppressHistory = true;
  await manager.loadLayout(result.layout, catalog);
  suppressHistory = false;
  historyApi?.reset(result.layout);
  commitRoomChange("recover-autosave");
  setSafety(`Autosave recuperado: ${new Date(result.savedAt).toLocaleString()}`, "ok");
}

async function undoRoom() {
  const ok = await historyApi?.undo?.();
  if (ok) {
    renderLayoutList();
    updateInspector();
    autosaveApi?.schedule();
    toast("Undo");
  }
}

async function redoRoom() {
  const ok = await historyApi?.redo?.();
  if (ok) {
    renderLayoutList();
    updateInspector();
    autosaveApi?.schedule();
    toast("Redo");
  }
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
  $("categoryFilter")?.addEventListener("change", renderCatalog);
  $("btnSave")?.addEventListener("click", saveCurrentLayout);
  $("btnLoad")?.addEventListener("click", loadCurrentLayout);
  $("btnRecover")?.addEventListener("click", recoverAutosave);
  $("btnUndo")?.addEventListener("click", undoRoom);
  $("btnRedo")?.addEventListener("click", redoRoom);
  $("btnGrid")?.addEventListener("click", () => controlsApi?.toggleGrid());
  $("btnCollision")?.addEventListener("click", () => controlsApi?.toggleCollision());
  $("btnFocus")?.addEventListener("click", () => updateInspector(true));
  $("btnRemove")?.addEventListener("click", () => { manager.remove(); commitRoomChange("remove"); });
  $("btnDuplicate")?.addEventListener("click", async () => { await manager.duplicate(); commitRoomChange("duplicate"); });
  $("btnDuplicateX")?.addEventListener("click", async () => { await manager.duplicate(undefined, [0.5, 0, 0]); commitRoomChange("duplicate-x"); });
  $("btnDuplicateZ")?.addEventListener("click", async () => { await manager.duplicate(undefined, [0, 0, 0.5]); commitRoomChange("duplicate-z"); });
  $("btnReset")?.addEventListener("click", async () => { await manager.resetSelected(); commitRoomChange("reset"); });
  $("btnLock")?.addEventListener("click", () => { manager.toggleLock(); commitRoomChange("lock"); });
  $("btnCenterItem")?.addEventListener("click", () => { manager.centerSelected(); commitRoomChange("center"); });
  $("btnGroundItem")?.addEventListener("click", () => { manager.groundSelected(); commitRoomChange("ground"); });
  $("btnRotate90")?.addEventListener("click", () => { manager.rotateSelected90(); commitRoomChange("rot90"); });
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
    commitRoomChange("apply-transform");
  });
}

async function init() {
  try {
    setStatus("Criando cena...");
    sceneApi = createRoomScene($("roomCanvas"));

    setStatus("Carregando catálogo...");
    catalog = await loadRoomCatalog();

    manager = createRoomItemManager({
      ...sceneApi,
      gridSize: 0.25,
      toast,
      onValidate: renderValidation,
      onObjectChanged: () => {
        updateInspector();
        autosaveApi?.schedule();
      },
      onObjectCommitted: (label) => {
        if (!suppressHistory) {
          autosaveApi?.schedule();
          historyApi?.push(label);
          updateHistoryButtons();
        }
      }
    });

    setStatus("Carregando layout...");
    layout = await loadRoomLayout();
    suppressHistory = true;
    await manager.loadLayout(layout, catalog);
    suppressHistory = false;

    autosaveApi = createAutosaveScheduler({
      getLayout: currentLayout,
      onStatus: (message) => setSafety(message, "ok")
    });

    historyApi = createRoomHistory({
      getLayout: currentLayout,
      applyLayout: async (nextLayout) => {
        suppressHistory = true;
        await manager.loadLayout(nextLayout, catalog);
        suppressHistory = false;
      },
      onChange: updateHistoryButtons
    });
    historyApi.reset(currentLayout());

    controlsApi = createRoomControls({
      manager,
      renderLayoutList,
      updateInspector,
      saveLayout: saveCurrentLayout,
      undo: undoRoom,
      redo: redoRoom,
      toast,
      grid: sceneApi.grid
    });

    bindUi();
    setMode("translate");
    updateCategoryLabels();
    renderCatalog();
    renderPresetList();
    renderLayoutList();
    updateInspector();
    updateHistoryButtons();
    autosaveApi.schedule();

    const autosave = loadRoomAutosave();
    if (autosave.ok && autosave.layout?.items?.length) {
      setSafety(`Autosave disponível: ${new Date(autosave.savedAt).toLocaleString()}`, "warn");
    } else {
      setSafety("Autosave ativo.", "ok");
    }

    setStatus("Room pronta");
    toast("Room pronta");
  } catch (err) {
    console.error(err);
    setStatus("Falha na Room");
    toast("Falha: " + (err?.message || err));
  }
}

window.addEventListener("beforeunload", () => {
  try {
    autosaveApi?.flush?.();
    controlsApi?.destroy?.();
    historyApi = null;
    manager?.dispose?.();
    sceneApi?.dispose?.();
  } catch {}
});

window.addEventListener("DOMContentLoaded", init);
