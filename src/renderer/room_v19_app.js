"use strict";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const ROADMAP = [
  "Confirmar que a Yoru aparece como player real no Third Person, não apenas fallback.",
  "Diagnóstico visual dentro da Room mostrando VRM carregado, fallback, erro de asset e caminho usado.",
  "Melhorar carregamento do Yoru.vrm com log claro de sucesso/falha.",
  "Painel de debug da Room com FPS, modo atual, posição do player, câmera e asset carregado.",
  "Botão Parar foco sempre soltar gizmo e seleção do item.",
  "Evitar conflito ao trocar rápido entre Build Mode, Yoru POV e Third Person.",
  "Câmera Third Person com colisão para não atravessar parede/mesa/piano/objetos grandes.",
  "Ajustar altura dos olhos no Yoru POV por VRM, com fallback configurável.",
  "Botão Recentrar player separado de reset total.",
  "Salvar posição do player corretamente no layout da Room.",
  "Salvar modo atual opcionalmente: Build, Yoru POV ou Third Person.",
  "Melhorar colisão do player com móveis grandes.",
  "Impedir player nascer dentro de objeto depois de carregar layout.",
  "Adicionar chão sólido real para pulo não atravessar ou flutuar.",
  "Melhorar pulo com suavidade, queda natural e limite de spam.",
  "Sistema de paredes da Room em vez de só chão aberto.",
  "Presets reais de quarto: gamer, escritório, musical e simples.",
  "Separar itens de cenário de itens de mão de forma rígida.",
  "Categorias melhores para items: chão, mesa, parede, mão, decoração, eletrônico, instrumento.",
  "Preview do item antes de colocar na Room.",
  "Snap no chão, mesa e parede dependendo do tipo do item.",
  "Pontos de encaixe para mesa: copo, notebook, dado, papel, celular.",
  "Pontos de encaixe para mão/avatar separados da Room.",
  "Impedir item pequeno cair no chão quando deveria ir para mesa.",
  "Botão Mandar para frente da Yoru.",
  "Botão Colocar na mesa mais próxima.",
  "Botão Alinhar com chão melhorado.",
  "Botão Duplicar em grade.",
  "Autosave com várias versões recuperáveis.",
  "Botão Restaurar layout padrão.",
  "Animação idle no Third Person.",
  "Animação walk quando anda.",
  "Animação jump quando pula.",
  "Animação run quando segura Shift.",
  "Sincronizar emotes da Yoru com player da Room.",
  "Sincronizar expressions PNG/VRM com player da Room.",
  "Permitir escolher avatar player: Yoru, Noelle ou outro VRM.",
  "Calibração de altura do avatar.",
  "Opção Mostrar corpo no Yoru POV para debug.",
  "Braços/mãos visíveis no First Person estilo VRChat.",
  "Unificar scripts V18.7, V18.8 e V18.9 para não acumular hotfix.",
  "Criar room_core.js separando player, câmera, layout e UI.",
  "Testes automáticos básicos para Room abrir, bundle gerar e assets existirem.",
  "Diagnóstico para imports de Three.js e @pixiv/three-vrm.",
  "Evitar duplicar handlers de botão quando aplica patch várias vezes.",
  "Garantir só um INICIAR.bat na raiz.",
  "Logs claros no terminal por etapa.",
  "MEMORIA_GPT_NOELLE.md atualizada após cada versão.",
  "Checklist de release: node check, bundle, assets, bat, package, memória.",
  "V19 consolidada limpa, sem restos de hotfix antigo.",
  "Tela Room Status dentro da Room.",
  "Indicador visual do modo atual no canto da tela.",
  "Mini tutorial dentro da Room com controles básicos.",
  "Botão Reset câmera separado do Parar foco.",
  "Reset player mais seguro, voltando para spawn livre.",
  "Spawn point editável para escolher onde a Yoru nasce.",
  "Item invisível Player Spawn no Build Mode.",
  "Proteção contra spawn dentro de parede/móvel.",
  "Sistema de paredes com colisão real.",
  "Teto opcional para Room fechada.",
  "Modo quarto aberto e quarto fechado.",
  "Luz ambiente configurável: claro, escuro, noite, neon, gamer.",
  "Slider de intensidade da luz.",
  "Botão Centralizar Room.",
  "Grid configurável: 0.1, 0.25, 0.5, 1.0.",
  "Snap toggle por eixo: X, Y, Z.",
  "Rotação com snap configurável: 5°, 15°, 30°, 45°, 90°.",
  "Botão Desfazer seleção além do Parar foco.",
  "Outline melhor no item selecionado.",
  "Highlight ao passar mouse sobre item.",
  "Painel de propriedades por item com nome, categoria, posição, rotação, escala e colisão.",
  "Permitir renomear itens colocados na Room.",
  "Permitir travar/destravar item individualmente.",
  "Permitir esconder/mostrar item sem apagar.",
  "Camadas: cenário, móveis, decoração, interativos.",
  "Filtro somente itens visíveis no layout list.",
  "Busca no layout list.",
  "Selecionar item na lista e olhar para ele somente em Build.",
  "Modo câmera livre sem selecionar objeto.",
  "Modo espectador/freecam separado da Yoru POV.",
  "Controle de velocidade da câmera livre.",
  "Controle de velocidade da Yoru.",
  "Controle de altura da câmera do Yoru POV.",
  "Controle de distância da câmera Third Person.",
  "Controle de suavidade da câmera Third Person.",
  "Colisão da câmera com paredes e objetos grandes mais precisa.",
  "Botão Teleportar Yoru para cá clicando no chão.",
  "Botão Trazer Yoru para frente da câmera.",
  "Botão Olhar para item selecionado sem travar foco permanentemente.",
  "Interação básica com objetos: sentar, tocar piano, pegar item, beber água.",
  "Tags de interação no manifesto: sit, drink, play_music, hold, inspect.",
  "Hotspots nos móveis: cadeira tem ponto de sentar, mesa tem ponto de colocar item.",
  "Lógica item de mão + emoção, por exemplo ação de beber usa item correto.",
  "Presets de ação: beber água, usar celular, sentar, tocar piano.",
  "Estados da Yoru por modo: idle, walk, run, jump, sit, interact.",
  "Transição suave entre animações.",
  "Fallback de animação se VRMA não existir.",
  "animation_manifest.json separado ligando animações a ações.",
  "interaction_manifest.json ligando itens a ações possíveis.",
  "V19 como versão consolidada, removendo restos de hotfix e deixando Room/Yoru como sistema principal estável."
];

const $ = (id) => document.getElementById(id);
const api = () => window.noelleRoom || window.noelleRoomV19 || null;

let renderer, scene, camera, orbit, transform, roomRoot, player, yoruVisual;
let mode = "build";
let selected = null;
let placed = new Map();
let catalog = [];
let history = [];
let historyIndex = -1;
let keys = new Set();
let pointerLocked = false;
let playerState = {
  pos: new THREE.Vector3(0, 0, 2.6),
  yaw: 0,
  pitch: 0,
  velocityY: 0,
  grounded: true,
  speed: 2.3,
  runSpeed: 4.2,
  radius: 0.28,
  eyeHeight: 1.50,
  avatarHeight: 1.62
};
let lastFrame = performance.now();

function toast(text) {
  const el = $("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function status(text, kind = "ok") {
  const box = $("statusBox");
  if (box) {
    box.textContent = text;
    box.style.color = kind === "bad" ? "var(--bad)" : kind === "warn" ? "var(--warn)" : "var(--ok)";
  }
  const asset = $("downAsset");
  if (asset) asset.textContent = "Asset: " + text;
}

function setMode(next) {
  mode = ["build", "pov", "third"].includes(next) ? next : "build";
  for (const [id, value] of Object.entries({ modeBuild: "build", modePov: "pov", modeThird: "third" })) {
    $(id)?.classList.toggle("active", value === mode);
  }
  $("hudMode").textContent = mode === "build" ? "Build" : mode === "pov" ? "Yoru POV" : "Third Person";
  $("downMode").textContent = "Modo: " + $("hudMode").textContent;

  const build = mode === "build";
  orbit.enabled = build;
  transform.enabled = build;
  if (transform.getHelper) transform.getHelper().visible = build;
  if (!build) transform.detach();

  if (player) player.visible = mode === "third";
  if (yoruVisual) yoruVisual.visible = mode === "third";

  if (mode !== "build") requestPointer();
  if (mode === "build") unlockPointer();
  toast($("hudMode").textContent);
}

function initScene() {
  const canvas = $("roomCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090a14);

  camera = new THREE.PerspectiveCamera(50, 1, 0.05, 160);
  camera.position.set(4.5, 3.2, 5.2);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, 0.8, 0);

  transform = new TransformControls(camera, renderer.domElement);
  transform.setMode("translate");
  transform.setTranslationSnap(0.25);
  transform.setRotationSnap(THREE.MathUtils.degToRad(15));
  transform.setScaleSnap(0.05);
  scene.add(transform.getHelper ? transform.getHelper() : transform);

  transform.addEventListener("dragging-changed", (event) => {
    orbit.enabled = !event.value && mode === "build";
  });
  transform.addEventListener("objectChange", () => {
    renderSelected();
    scheduleAutosave();
  });
  transform.addEventListener("mouseUp", () => commitHistory());

  scene.add(new THREE.HemisphereLight(0xffffff, 0x171020, 1.8));
  const light = new THREE.DirectionalLight(0xffffff, 2.0);
  light.position.set(4, 6, 5);
  light.castShadow = true;
  scene.add(light);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x171420, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "Room Floor";
  scene.add(floor);
  scene.add(new THREE.GridHelper(10, 40, 0xff477e, 0x3b3147));

  roomRoot = new THREE.Group();
  scene.add(roomRoot);

  player = new THREE.Group();
  scene.add(player);
  player.visible = false;
  makeFallbackPlayer();

  window.addEventListener("resize", resize);
  resize();
  renderer.domElement.addEventListener("pointerdown", pickObject);
  animate();
}

function makeFallbackPlayer() {
  yoruVisual?.removeFromParent?.();
  yoruVisual = new THREE.Group();
  const bodyGeom = typeof THREE.CapsuleGeometry === "function" ? new THREE.CapsuleGeometry(0.22, 0.75, 6, 12) : new THREE.CylinderGeometry(0.22, 0.22, 1.2, 16);
  const body = new THREE.Mesh(bodyGeom, new THREE.MeshStandardMaterial({ color: 0xff477e, roughness: 0.65 }));
  body.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffc1d5 }));
  head.position.y = 1.45;
  yoruVisual.add(body, head);
  player.add(yoruVisual);
}

async function loadYoruPlayer() {
  const urls = ["./assets/avatars/Yoru.vrm", "./assets/Yoru.vrm", "./assets/Noelle.vrm", "./assets/avatars/Noelle.vrm"];
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData?.vrm;
      const root = vrm?.scene || gltf.scene;
      if (!root) throw new Error("sem scene");
      try { VRMUtils.rotateVRM0?.(vrm); } catch {}
      const wrap = new THREE.Group();
      wrap.add(root);
      normalizeObject(wrap, 1.62);
      yoruVisual.removeFromParent();
      yoruVisual = wrap;
      player.add(yoruVisual);
      playerState.eyeHeight = 1.50;
      status("Yoru player carregada: " + url, "ok");
      return;
    } catch (err) {
      console.warn("Falha ao carregar player", url, err);
    }
  }
  status("Yoru.vrm não carregou; fallback visível", "warn");
}

function normalizeObject(object, targetSize = 1) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) object.scale.setScalar(targetSize / maxDim);
}

function resize() {
  const rect = $("roomCanvas").getBoundingClientRect();
  const w = Math.max(1, rect.width | 0);
  const h = Math.max(1, rect.height | 0);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  orbit.update();
  updatePlayer(dt);
  renderer.render(scene, camera);
}

function cleanPath(file, base) {
  const f = String(file || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (/^(file|https?):/i.test(f)) return f;
  if (f.startsWith("src/assets/")) return "./assets/" + f.slice("src/assets/".length);
  if (f.startsWith("assets/")) return "./" + f;
  if (f.startsWith(base + "/")) return "./assets/" + f;
  return "./assets/" + base + "/" + f;
}

async function loadCatalog() {
  const list = [];
  try {
    const remote = await api()?.listCatalog?.();
    if (remote?.ok && Array.isArray(remote.items)) list.push(...remote.items);
  } catch {}

  if (!list.length) {
    for (const [url, base, category] of [
      ["./assets/item_manifest.json", "items", "furniture"],
      ["./assets/motion_manifest.json", "motions", "motion"],
      ["./assets/expressions/manifest.json", "expressions", "expression"]
    ]) {
      try {
        const data = await (await fetch(url)).json();
        const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.motions) ? data.motions : Array.isArray(data.expressions) ? data.expressions : [];
        arr.forEach((item) => list.push({ ...item, base, category }));
      } catch {}
    }
  }

  catalog = list.map((item, index) => {
    const id = item.id || item.name || item.label || ("item_" + index);
    const file = item.file || item.path || item.url || "";
    const hay = `${id} ${file} ${item.category || ""}`.toLowerCase();
    const category = item.category || (hay.includes("tablet") || hay.includes("phone") || hay.includes("monitor") ? "electronics" : hay.includes("table") || hay.includes("desk") || hay.includes("piano") || hay.includes("chair") ? "furniture" : hay.includes(".vrm") ? "avatar" : "decor");
    return { id: String(id), label: item.label || item.title || String(id), file, category, base: item.base || "items", raw: item };
  }).filter((item) => item.file || item.category === "avatar");
  renderCatalog();
}

function renderCatalog() {
  const list = $("assetList");
  if (!list) return;
  const q = ($("assetSearch").value || "").toLowerCase();
  const filter = $("assetFilter").value || "all";
  list.innerHTML = "";
  catalog.filter((item) => {
    const okFilter = filter === "all" || item.category === filter;
    const okSearch = !q || `${item.id} ${item.label} ${item.file} ${item.category}`.toLowerCase().includes(q);
    return okFilter && okSearch;
  }).slice(0, 180).forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `<strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.file || item.category)}</small><button>Adicionar</button>`;
    card.querySelector("button").onclick = () => addCatalogItem(item);
    list.appendChild(card);
  });
}

async function addCatalogItem(item) {
  if (item.category === "motion" || item.category === "expression") {
    toast("Este item é de avatar; use a janela principal para aplicar.");
    return;
  }
  const loader = new GLTFLoader();
  const url = cleanPath(item.file, item.base || "items");
  let object;
  try {
    object = (await loader.loadAsync(url)).scene;
  } catch (err) {
    object = new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5), new THREE.MeshStandardMaterial({ color: 0x7a1f35 }));
    object.userData.loadError = String(err?.message || err);
  }
  const wrap = new THREE.Group();
  wrap.name = "room:" + item.id;
  wrap.add(object);
  normalizeObject(wrap, item.category === "furniture" ? 1.1 : .6);
  wrap.position.set(0, 0, 0);
  wrap.userData.roomItem = item;
  wrap.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    }
  });
  roomRoot.add(wrap);
  const uid = item.id + "_" + Date.now().toString(36);
  placed.set(uid, wrap);
  wrap.userData.uid = uid;
  selectObject(wrap);
  commitHistory();
  toast("Adicionado: " + item.label);
}

function selectObject(object) {
  selected = object || null;
  if (selected && mode === "build") transform.attach(selected);
  else transform.detach();
  renderSelected();
}

function renderSelected() {
  const box = $("selectedBox");
  if (!box) return;
  if (!selected) {
    box.textContent = "Nenhum objeto selecionado.";
    return;
  }
  const p = selected.position;
  box.innerHTML = `<b>${escapeHtml(selected.name || "Objeto")}</b><br>X ${p.x.toFixed(2)} · Y ${p.y.toFixed(2)} · Z ${p.z.toFixed(2)}`;
}

function pickObject(event) {
  if (mode !== "build" || transform.dragging) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects([...placed.values()], true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !obj.userData?.uid) obj = obj.parent;
  if (obj) selectObject(obj);
}

function stopFocus() {
  if (mode === "build") {
    selectObject(null);
    orbit.target.set(0, .8, 0);
    camera.position.set(4.5, 3.2, 5.2);
    toast("Foco no objeto desligado");
  } else {
    requestPointer();
    toast("Movimento livre ativo");
  }
}

function updatePlayer(dt) {
  if (mode === "build") return;
  const speed = keys.has("shift") ? playerState.runSpeed : playerState.speed;
  const fwd = new THREE.Vector3(Math.sin(playerState.yaw), 0, -Math.cos(playerState.yaw));
  const right = new THREE.Vector3(Math.cos(playerState.yaw), 0, Math.sin(playerState.yaw));
  const dir = new THREE.Vector3();
  if (keys.has("w")) dir.add(fwd);
  if (keys.has("s")) dir.sub(fwd);
  if (keys.has("d")) dir.add(right);
  if (keys.has("a")) dir.sub(right);
  if (dir.lengthSq()) playerState.pos.add(dir.normalize().multiplyScalar(speed * dt));

  if (!playerState.grounded || playerState.pos.y > 0.001) {
    playerState.velocityY -= 10.5 * dt;
    playerState.pos.y += playerState.velocityY * dt;
    if (playerState.pos.y <= 0) {
      playerState.pos.y = 0;
      playerState.velocityY = 0;
      playerState.grounded = true;
    }
  }

  player.position.copy(playerState.pos);
  player.rotation.y = playerState.yaw;
  if (mode === "pov") {
    camera.position.set(playerState.pos.x, playerState.pos.y + playerState.eyeHeight, playerState.pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = playerState.yaw;
    camera.rotation.x = playerState.pitch;
  } else {
    const target = playerState.pos.clone().add(new THREE.Vector3(0, 1.18, 0));
    const desired = target.clone().add(fwd.clone().multiplyScalar(-3.2)).add(new THREE.Vector3(0, 1.4, 0));
    camera.position.copy(desired);
    camera.lookAt(target);
  }
  $("downPlayer").textContent = `Yoru: ${playerState.pos.x.toFixed(1)}, ${playerState.pos.y.toFixed(1)}, ${playerState.pos.z.toFixed(1)}`;
}

function jump() {
  if (mode === "build") {
    toast("Pulo funciona em Yoru POV ou Third Person");
    return;
  }
  if (!playerState.grounded) return;
  playerState.velocityY = 4.25;
  playerState.grounded = false;
  toast("Pular");
}

function requestPointer() {
  try { renderer.domElement.requestPointerLock?.(); } catch {}
}

function unlockPointer() {
  try { if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.(); } catch {}
}

function serializeLayout() {
  const items = [...placed.entries()].map(([uid, obj]) => ({
    uid,
    itemId: obj.userData.roomItem?.id || uid,
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotationDeg: [obj.rotation.x, obj.rotation.y, obj.rotation.z].map(THREE.MathUtils.radToDeg),
    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    file: obj.userData.roomItem?.file || ""
  }));
  return { version: 19, player: { position: [playerState.pos.x, playerState.pos.y, playerState.pos.z], yaw: playerState.yaw, pitch: playerState.pitch }, items };
}

async function saveLayout() {
  const layout = serializeLayout();
  try {
    const result = await api()?.saveLayout?.(layout);
    if (result?.ok) toast("Layout salvo");
    else throw new Error("IPC indisponível");
  } catch {
    localStorage.setItem("noelle_room_v19_layout", JSON.stringify(layout));
    toast("Layout salvo local");
  }
}

async function loadLayout() {
  let layout = null;
  try {
    const result = await api()?.loadLayout?.();
    if (result?.ok) layout = result.layout;
  } catch {}
  if (!layout) {
    try { layout = JSON.parse(localStorage.getItem("noelle_room_v19_layout") || "null"); } catch {}
  }
  if (!layout) return toast("Nenhum layout salvo");
  clearRoom();
  if (Array.isArray(layout.items)) {
    for (const entry of layout.items) {
      const item = catalog.find((x) => x.id === entry.itemId) || { id: entry.itemId, label: entry.itemId, file: entry.file, category: "decor", base: "items" };
      await addCatalogItem(item);
      if (selected) {
        selected.position.set(...(entry.position || [0,0,0]));
        selected.rotation.set(...(entry.rotationDeg || [0,0,0]).map(THREE.MathUtils.degToRad));
      }
    }
  }
  if (layout.player?.position) playerState.pos.set(...layout.player.position);
  playerState.yaw = layout.player?.yaw || 0;
  playerState.pitch = layout.player?.pitch || 0;
  selectObject(null);
  toast("Layout carregado");
}

function clearRoom() {
  for (const obj of placed.values()) obj.removeFromParent();
  placed.clear();
  selectObject(null);
}

function commitHistory() {
  const snap = JSON.stringify(serializeLayout());
  history = history.slice(0, historyIndex + 1);
  history.push(snap);
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
}

function scheduleAutosave() {
  clearTimeout(scheduleAutosave._t);
  scheduleAutosave._t = setTimeout(() => {
    localStorage.setItem("noelle_room_v19_autosave", JSON.stringify(serializeLayout()));
    $("downSave").textContent = "Autosave: " + new Date().toLocaleTimeString("pt-BR");
  }, 700);
}

function recoverAutosave() {
  try {
    const raw = localStorage.getItem("noelle_room_v19_autosave");
    if (!raw) return toast("Sem autosave");
    localStorage.setItem("noelle_room_v19_layout", raw);
    loadLayout();
  } catch {
    toast("Autosave falhou");
  }
}

function renderRoadmap() {
  const list = $("roadmapList");
  const q = ($("roadmapSearch").value || "").toLowerCase();
  list.innerHTML = "";
  ROADMAP.forEach((text, idx) => {
    if (q && !text.toLowerCase().includes(q) && !String(idx+1).includes(q)) return;
    const card = document.createElement("article");
    card.className = "roadmap-card";
    card.innerHTML = `<strong>#${idx+1}</strong><small>${escapeHtml(text)}</small>`;
    list.appendChild(card);
  });
}

function bindUI() {
  $("modeBuild").onclick = () => setMode("build");
  $("modePov").onclick = () => setMode("pov");
  $("modeThird").onclick = () => setMode("third");
  $("btnJump").onclick = jump;
  $("btnFreeMove").onclick = stopFocus;
  $("toolResetPlayer").onclick = () => { playerState.pos.set(0,0,2.6); playerState.yaw = 0; playerState.pitch = 0; toast("Yoru resetada"); };
  $("toolDefaultCamera").onclick = stopFocus;
  $("btnSave").onclick = saveLayout;
  $("btnLoad").onclick = loadLayout;
  $("btnRecover").onclick = recoverAutosave;
  $("toolMove").onclick = () => transform.setMode("translate");
  $("toolRotate").onclick = () => transform.setMode("rotate");
  $("toolScale").onclick = () => transform.setMode("scale");
  $("toolGrid").onclick = () => toast("Grid ativo");
  $("toolUndo").onclick = () => toast("Undo estrutural pronto para consolidar");
  $("toolRedo").onclick = () => toast("Redo estrutural pronto para consolidar");
  $("btnDuplicate").onclick = () => selected ? duplicateSelected() : toast("Nenhum item");
  $("btnLock").onclick = () => selected ? (selected.userData.locked = !selected.userData.locked, toast(selected.userData.locked ? "Travado" : "Destravado")) : toast("Nenhum item");
  $("btnGround").onclick = () => selected ? (selected.position.y = 0, renderSelected(), scheduleAutosave()) : toast("Nenhum item");
  $("btnRemove").onclick = () => { if (!selected) return toast("Nenhum item"); selected.removeFromParent(); placed.delete(selected.userData.uid); selectObject(null); scheduleAutosave(); };
  $("assetSearch").oninput = renderCatalog;
  $("assetFilter").onchange = renderCatalog;
  $("roadmapSearch").oninput = renderRoadmap;

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["input","textarea","select"].includes(e.target?.tagName?.toLowerCase())) return;
    if (mode !== "build") {
      if (["w","a","s","d","shift"].includes(k)) keys.add(k);
      if (e.code === "Space") { e.preventDefault(); jump(); }
    }
    if (e.ctrlKey && k === "s") { e.preventDefault(); saveLayout(); }
    if (k === "escape") unlockPointer();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("mousemove", (e) => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
    if (mode === "build" || !pointerLocked) return;
    playerState.yaw -= e.movementX * 0.0022;
    playerState.pitch = Math.max(-1.18, Math.min(1.18, playerState.pitch - e.movementY * 0.0022));
  });
  window.addEventListener("blur", () => { keys.clear(); unlockPointer(); });
}

function duplicateSelected() {
  const clone = selected.clone(true);
  clone.position.x += .5;
  clone.position.z += .5;
  const uid = (selected.userData.roomItem?.id || "clone") + "_" + Date.now().toString(36);
  clone.userData = { ...selected.userData, uid };
  roomRoot.add(clone);
  placed.set(uid, clone);
  selectObject(clone);
  scheduleAutosave();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

async function boot() {
  initScene();
  bindUI();
  renderRoadmap();
  await loadCatalog();
  await loadYoruPlayer();
  setMode("build");
  status("Room V19 pronta", "ok");
  commitHistory();
}

window.addEventListener("DOMContentLoaded", boot);
