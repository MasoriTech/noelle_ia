import { createRoomScene } from "./room_scene.js";
import { loadRoomCatalog, filterCatalogForRoom, groupCatalogCounts } from "./room_catalog.js";
import { createRoomItemManager } from "./room_items.js";
import { loadRoomLayout, saveRoomLayout, DEFAULT_ROOM_PRESETS, presetToLayout, safeLayout } from "./room_layout_store.js";
import { createRoomControls } from "./room_controls.js";
import { createRoomHistory } from "./room_history.js";
import { createAutosaveScheduler, loadRoomAutosave, clearRoomAutosave } from "./room_autosave.js";
import { createRoomPlayerController } from "./room_player_controller.js";
import { createRoomModeManager } from "./room_modes.js";

const $ = (id) => document.getElementById(id);

let catalog = [];
let layout = null;
let manager = null;
let sceneApi = null;
let controlsApi = null;
let historyApi = null;
let autosaveApi = null;
let playerApi = null;
let modeApi = null;
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

function setModeBox(message, type = "ok") {
  const el = $("modeBox");
  if (!el) return;
  el.className = `validation-box ${type}`;
  el.textContent = message;
}

function currentLayout() {
  return safeLayout({
    version: 1,
    roomId: "default_room",
    grid: layout?.grid || { size: 0.25, enabled: true },
    player: {
      position: playerApi ? [playerApi.player.position.x, playerApi.player.position.y, playerApi.player.position.z] : [0, 0, 2.6],
      yaw: playerApi?.state?.yaw || 0,
      pitch: playerApi?.state?.pitch || 0
    },
    items: manager?.serialize?.() || []
  });
}

function applyPlayerFromLayout(nextLayout) {
  if (!playerApi || !nextLayout?.player) return;
  playerApi.setPlayerFromLayout(nextLayout.player);
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
        modeApi?.setMode("build");
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
      modeApi?.setMode("build");
      const presetLayout = presetToLayout(preset);
      await manager.loadLayout(presetLayout, catalog);
      applyPlayerFromLayout(presetLayout);
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
      modeApi?.setMode("build");
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
  modeApi?.setMode("build");
  layout = await loadRoomLayout();
  suppressHistory = true;
  await manager.loadLayout(layout, catalog);
  applyPlayerFromLayout(layout);
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
  modeApi?.setMode("build");
  suppressHistory = true;
  await manager.loadLayout(result.layout, catalog);
  applyPlayerFromLayout(result.layout);
  suppressHistory = false;
  historyApi?.reset(result.layout);
  commitRoomChange("recover-autosave");
  setSafety(`Autosave recuperado: ${new Date(result.savedAt).toLocaleString()}`, "ok");
}

async function undoRoom() {
  modeApi?.setMode("build");
  const ok = await historyApi?.undo?.();
  if (ok) {
    renderLayoutList();
    updateInspector();
    autosaveApi?.schedule();
    toast("Undo");
  }
}

async function redoRoom() {
  modeApi?.setMode("build");
  const ok = await historyApi?.redo?.();
  if (ok) {
    renderLayoutList();
    updateInspector();
    autosaveApi?.schedule();
    toast("Redo");
  }
}

function setTransformMode(mode) {
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
  $("btnModeBuild")?.addEventListener("click", () => modeApi?.setMode("build"));
  $("btnModeFirst")?.addEventListener("click", () => modeApi?.setMode("first_person"));
  $("btnModeThird")?.addEventListener("click", () => modeApi?.setMode("third_person"));
  $("btnResetPlayer")?.addEventListener("click", () => { playerApi?.resetPlayer(); autosaveApi?.schedule(); });
  $("btnRemove")?.addEventListener("click", () => { modeApi?.setMode("build"); manager.remove(); commitRoomChange("remove"); });
  $("btnDuplicate")?.addEventListener("click", async () => { modeApi?.setMode("build"); await manager.duplicate(); commitRoomChange("duplicate"); });
  $("btnDuplicateX")?.addEventListener("click", async () => { modeApi?.setMode("build"); await manager.duplicate(undefined, [0.5, 0, 0]); commitRoomChange("duplicate-x"); });
  $("btnDuplicateZ")?.addEventListener("click", async () => { modeApi?.setMode("build"); await manager.duplicate(undefined, [0, 0, 0.5]); commitRoomChange("duplicate-z"); });
  $("btnReset")?.addEventListener("click", async () => { modeApi?.setMode("build"); await manager.resetSelected(); commitRoomChange("reset"); });
  $("btnLock")?.addEventListener("click", () => { modeApi?.setMode("build"); manager.toggleLock(); commitRoomChange("lock"); });
  $("btnCenterItem")?.addEventListener("click", () => { modeApi?.setMode("build"); manager.centerSelected(); commitRoomChange("center"); });
  $("btnGroundItem")?.addEventListener("click", () => { modeApi?.setMode("build"); manager.groundSelected(); commitRoomChange("ground"); });
  $("btnRotate90")?.addEventListener("click", () => { modeApi?.setMode("build"); manager.rotateSelected90(); commitRoomChange("rot90"); });
  $("btnModeMove")?.addEventListener("click", () => setTransformMode("translate"));
  $("btnModeRotate")?.addEventListener("click", () => setTransformMode("rotate"));
  $("btnModeScale")?.addEventListener("click", () => setTransformMode("scale"));

  $("btnApplyTransform")?.addEventListener("click", () => {
    modeApi?.setMode("build");
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

    playerApi = createRoomPlayerController({
      scene: sceneApi.scene,
      camera: sceneApi.camera,
      renderer: sceneApi.renderer,
      getEntries: () => [...manager.placed.values()],
      toast,
      setStatus,
      onModeChange: () => {},
      onPlayerChanged: () => autosaveApi?.schedule()
    });

    modeApi = createRoomModeManager({
      sceneApi,
      manager,
      player: playerApi,
      setModeBox,
      toast,
      updateInspector
    });

    setStatus("Carregando layout...");
    layout = await loadRoomLayout();
    suppressHistory = true;
    await manager.loadLayout(layout, catalog);
    applyPlayerFromLayout(layout);
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
        applyPlayerFromLayout(nextLayout);
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
      grid: sceneApi.grid,
      getRoomMode: () => modeApi?.mode || "build"
    });

    bindUi();
    setTransformMode("translate");
    modeApi.setMode("build");
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
    playerApi?.dispose?.();
    manager?.dispose?.();
    sceneApi?.dispose?.();
  } catch {}
});

window.addEventListener("DOMContentLoaded", init);
