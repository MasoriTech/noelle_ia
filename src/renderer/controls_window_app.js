"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const appState = {
  page: "home",
  model: "qwen3:0.6b",
  profile: "rapido",
  persona: "nobre",
  theme: "noelle",
  messages: [
    { role: "assistant", content: "Oi! Agora a Noelle voltou a carregar avatar, expressões, motions VRMA, inventário e TTS/STT pelo boot automático.", at: Date.now() }
  ],
  memories: [],
  assets: null,
  lastMotion: null,
  avatarAlwaysOnTop: false
};

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function showToast(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function selectHasValue(select, value) {
  return !!select && Array.from(select.options).some((opt) => opt.value === value);
}

function setPage(page) {
  appState.page = page;
  $$(".page").forEach((el) => el.classList.toggle("active", el.dataset.page === page));
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.target === page));
  const titles = { home: "Principal", avatar: "Avatar", chat: "Chat IA", emotes: "Emotes", inventory: "Inventário", settings: "Configurações", about: "Sobre" };
  const title = $("#topTitle");
  const subtitle = $("#topSubtitle");
  if (title) title.textContent = titles[page] || "Noelle";
  if (subtitle) subtitle.textContent = `${titles[page] || "Noelle"} · Noelle Companion 2026`;
  if (page === "chat") scrollChatToBottom(); if (page === "avatar") window.NoelleAvatarTabV1982?.render?.();
}

function setGlobalStatus(text, type = "warn") {
  const label = $("#globalStatus");
  const dot = $("#globalStatusDot");
  if (label) label.textContent = text;
  if (dot) {
    dot.classList.remove("ok", "bad");
    if (type === "ok") dot.classList.add("ok");
    if (type === "bad") dot.classList.add("bad");
  }
}

function setChatStatus(text, detail = "") {
  const pill = $("#chatStatusPill");
  const detailEl = $("#chatDetailStatus");
  if (pill) pill.textContent = text;
  if (detailEl) detailEl.textContent = detail;
}

function autosizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 130) + "px";
}

function renderMessages() {
  const log = $("#chatLog");
  if (!log) return;
  log.innerHTML = "";
  appState.messages.forEach((msg, index) => {
    const item = document.createElement("article");
    const role = msg.role === "user" || msg.role === "assistant" || msg.role === "system" ? msg.role : "system";
    item.className = `message ${role}${msg.error ? " error" : ""}`;
    const label = role === "user" ? "Você" : role === "assistant" ? "Noelle" : "Sistema";
    const timing = msg.seconds ? ` · ${msg.seconds}s` : "";
    const speakButton = role === "assistant" ? `<button class="speak-btn" data-speak-index="${index}">🔊 Ler</button>` : "";
    item.innerHTML = `
      <div class="message-meta"><span>${escapeText(label)}${escapeText(timing)} · ${escapeText(msg.time || nowTime())}</span>${speakButton}</div>
      <div class="message-body">${escapeText(msg.content)}</div>
    `;
    log.appendChild(item);
  });
  $$(".speak-btn", log).forEach((btn) => {
    btn.addEventListener("click", () => {
      const msg = appState.messages[Number(btn.dataset.speakIndex)];
      speakText(msg?.content || "");
    });
  });
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const log = $("#chatLog");
  if (!log) return;
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
}

async function loadSavedState() {
  if (!window.noelleAPI?.loadState) return;
  try {
    const result = await window.noelleAPI.loadState();
    if (result?.ok && result.state) {
      Object.assign(appState, {
        model: result.state.model || appState.model,
        profile: result.state.profile || appState.profile,
        persona: result.state.persona || appState.persona,
        theme: result.state.theme || appState.theme,
        memories: Array.isArray(result.state.memories) ? result.state.memories : [],
        avatarAlwaysOnTop: !!result.state.avatar?.alwaysOnTop
      });
      if (Array.isArray(result.state.messages) && result.state.messages.length) appState.messages = result.state.messages;
    }
  } catch (err) {
    console.warn("Falha ao carregar estado:", err);
  }
}

async function persistState() {
  if (!window.noelleAPI?.saveState) return;
  try {
    await window.noelleAPI.saveState({
      model: appState.model,
      profile: appState.profile,
      persona: appState.persona,
      theme: appState.theme,
      memories: appState.memories,
      messages: appState.messages.slice(-40),
      avatar: { alwaysOnTop: appState.avatarAlwaysOnTop }
    });
  } catch (err) {
    console.warn("Falha ao salvar estado:", err);
  }
}

function syncControlsFromState() {
  const modelSelect = $("#modelSelect");
  const profileSelect = $("#profileSelect");
  const personaSelect = $("#personaSelect");
  const themeSelect = $("#themeSelect");
  if (selectHasValue(modelSelect, appState.model)) modelSelect.value = appState.model;
  else if (modelSelect) modelSelect.value = "qwen3:0.6b";
  if (selectHasValue(profileSelect, appState.profile)) profileSelect.value = appState.profile;
  else if (profileSelect) profileSelect.value = "rapido";
  if (selectHasValue(personaSelect, appState.persona)) personaSelect.value = appState.persona;
  else if (personaSelect) personaSelect.value = "nobre";
  if (selectHasValue(themeSelect, appState.theme)) themeSelect.value = appState.theme;
  else if (themeSelect) themeSelect.value = "noelle";
  applyTheme(themeSelect?.value || appState.theme);
}

function applyTheme(theme) {
  appState.theme = theme || "noelle";
  document.body.classList.remove("theme-noelle", "theme-pbv", "theme-dark", "theme-light");
  document.body.classList.add(`theme-${appState.theme}`);
}

async function refreshStatus({ quiet = false } = {}) {
  if (!window.noelleAPI?.status) {
    setGlobalStatus("API indisponível", "bad");
    setChatStatus("IA indisponível", "preload não carregou");
    return null;
  }
  try {
    const status = await window.noelleAPI.status();
    const online = !!status?.ollama?.ok;
    const counts = status?.assets?.counts || {};
    setGlobalStatus(online ? "Ollama online" : "Ollama offline", online ? "ok" : "bad");
    setChatStatus(online ? `IA online · ${appState.profile}` : "IA offline", online ? "Pronto." : "Abra o Ollama em 127.0.0.1:11434");
    updateAssetSummary(counts);
    if (!quiet) showToast(online ? `Ollama online. Assets: ${counts.expressions || 0} expressões, ${counts.motions || 0} motions.` : status?.ollama?.error || "Ollama offline.");
    return status;
  } catch (err) {
    setGlobalStatus("Erro no status", "bad");
    setChatStatus("Erro", String(err.message || err));
    if (!quiet) showToast("Erro ao consultar status.");
    return null;
  }
}

function updateAssetSummary(counts = {}) {
  const box = $("#assetSummary");
  if (!box) return;
  box.innerHTML = `
    <span>Expressões: <strong>${Number(counts.expressions || 0)}</strong></span>
    <span>Motions VRMA: <strong>${Number(counts.motions || 0)}</strong></span>
    <span>Itens GLB: <strong>${Number(counts.items || 0)}</strong></span>
    <span>Avatares VRM: <strong>${Number(counts.avatars || 0)}</strong></span>
  `;
}

async function loadAssets() {
  if (!window.noelleAPI?.assets) return;
  try {
    const result = await window.noelleAPI.assets();
    if (result?.ok) {
      appState.assets = result.assets;
      renderAssets(result.assets);
      updateAssetSummary(result.assets.counts);
      const noelle = result.assets.avatars?.[0];
      const label = $("#avatarPathLabel");
      if (label) label.textContent = noelle?.rel || "Nenhum VRM encontrado em src/assets.";
    }
  } catch (err) {
    console.warn("Falha ao carregar assets:", err);
    showToast("Falha ao carregar assets.");
  }
}

function renderAssets(assets) {
  renderExpressionCards(assets?.expressions || []);
  renderMotionCards(assets?.motions || []);
  renderItemCards(assets?.items || []);
}

function makeAssetCard(asset, options = {}) {
  const card = document.createElement("article");
  card.className = `asset-card ${asset.exists ? "" : "missing"}`;
  const visual = options.image && asset.url
    ? `<img src="${escapeText(asset.url)}" alt="${escapeText(asset.label)}" />`
    : `<div class="asset-icon">${escapeText(options.icon || "◇")}</div>`;
  card.innerHTML = `
    ${visual}
    <div><strong>${escapeText(asset.label)}</strong><small>${escapeText(asset.rel || asset.file || "")}${asset.exists ? "" : " · ausente"}</small></div>
    <button>${escapeText(options.actionLabel || "Aplicar")}</button>
  `;
  card.querySelector("button")?.addEventListener("click", () => options.onClick?.(asset));
  return card;
}

function renderExpressionCards(expressions) {
  const grid = $("#expressionsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!expressions.length) {
    grid.innerHTML = `<p class="muted">Nenhuma expressão encontrada em src/assets/expressions.</p>`;
    return;
  }
  expressions.forEach((asset) => grid.appendChild(makeAssetCard(asset, {
    image: true,
    actionLabel: "Aplicar expressão",
    onClick: (entry) => sendAvatarCommand("expression", entry)
  })));
}

function renderMotionCards(motions) {
  const grid = $("#motionsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!motions.length) {
    grid.innerHTML = `<p class="muted">Nenhum .vrma encontrado em src/assets/motions.</p>`;
    return;
  }
  motions.forEach((asset) => grid.appendChild(makeAssetCard(asset, {
    icon: "▶",
    actionLabel: "Tocar emote",
    onClick: (entry) => {
      appState.lastMotion = entry;
      sendAvatarCommand("motion", entry);
    }
  })));
}

function renderItemCards(items) {
  const grid = $("#itemsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<p class="muted">Nenhum item encontrado em src/assets/items ou item_manifest.json.</p>`;
    return;
  }
  items.forEach((asset) => grid.appendChild(makeAssetCard(asset, {
    icon: "◇",
    actionLabel: "Equipar item",
    onClick: (entry) => sendAvatarCommand("item", entry)
  })));
}

async function sendAvatarCommand(command, payload = {}) {
  if (!window.noelleAPI?.avatarCommand) {
    showToast("API do avatar indisponível.");
    return;
  }
  try {
    await window.noelleAPI.openAvatar?.();
    const result = await window.noelleAPI.avatarCommand(command, payload);
    showToast(result?.ok ? `Avatar: ${command}` : result?.error || "Falha no avatar.");
  } catch (err) {
    showToast("Erro no comando do avatar: " + (err.message || err));
  }
}

async function speakText(text) {
  if (!text.trim()) return;
  const label = $("#ttsStatus");
  if (label) label.textContent = "Falando...";
  try {
    const result = await window.noelleAPI?.speak?.(text);
    if (label) label.textContent = result?.ok ? `TTS OK (${result.engine || "engine"})` : result?.error || "Falha no TTS.";
    showToast(result?.ok ? "TTS executado." : result?.error || "Falha no TTS.");
  } catch (err) {
    if (label) label.textContent = String(err.message || err);
    showToast("Erro no TTS.");
  }
}

async function sendChatMessage(text) {
  const content = String(text || "").trim();
  if (!content) return;
  const input = $("#chatInput");
  if (input) { input.value = ""; autosizeTextarea(input); }
  appState.messages.push({ role: "user", content, at: Date.now() });
  renderMessages();
  setChatStatus("Gerando...", "Aguardando Ollama responder.");
  await persistState();

  try {
    const history = appState.messages.slice(-14).map((m) => ({ role: m.role, content: m.content }));
    const result = await window.noelleAPI?.chat?.({ message: content, history, model: appState.model, profile: appState.profile, persona: appState.persona });
    if (!result?.ok) {
      appState.messages.push({ role: "system", content: result?.error || "Erro desconhecido no chat.", error: true, at: Date.now() });
      setChatStatus("Erro", result?.error || "Falha no chat.");
    } else {
      appState.messages.push({ role: "assistant", content: result.message, seconds: result.seconds, at: Date.now() });
      setChatStatus(`IA online · ${appState.profile}`, `Resposta em ${result.seconds}s`);
    }
  } catch (err) {
    appState.messages.push({ role: "system", content: "Erro no renderer: " + (err.message || err), error: true, at: Date.now() });
    setChatStatus("Erro", String(err.message || err));
  }
  appState.messages = appState.messages.slice(-40);
  renderMessages();
  await persistState();
}

function bindEvents() {
  $$(".nav-item[data-target]").forEach((btn) => btn.addEventListener("click", () => setPage(btn.dataset.target)));
  $("#refreshStatusBtn")?.addEventListener("click", () => refreshStatus());
  $("#statusBtn")?.addEventListener("click", () => refreshStatus());
  $("#refreshAssetsBtn")?.addEventListener("click", () => loadAssets());

  ["#openAvatarBtn", "#openAvatarBtnTop"].forEach((selector) => $(selector)?.addEventListener("click", () => window.noelleAPI?.openAvatar?.()));
  $$('[data-avatar-action="open"]').forEach((btn) => btn.addEventListener("click", () => window.noelleAPI?.openAvatar?.()));
  $$('[data-avatar-action]').forEach((btn) => {
    if (btn.dataset.avatarAction === "open") return;
    btn.addEventListener("click", () => sendAvatarCommand(btn.dataset.avatarAction, {}));
  });
  $$('[data-avatar-camera]').forEach((btn) => btn.addEventListener("click", () => sendAvatarCommand("camera", { value: btn.dataset.avatarCamera })));
  $("#repeatLastMotionBtn")?.addEventListener("click", () => appState.lastMotion ? sendAvatarCommand("motion", appState.lastMotion) : showToast("Nenhum emote tocado ainda."));
  $("#avatarCenterBtn")?.addEventListener("click", () => sendAvatarCommand("center", {}));
  $("#avatarTopBtn")?.addEventListener("click", async () => {
    appState.avatarAlwaysOnTop = !appState.avatarAlwaysOnTop;
    const result = await window.noelleAPI?.setAvatarAlwaysOnTop?.(appState.avatarAlwaysOnTop);
    showToast(result?.ok ? `Sempre no topo: ${appState.avatarAlwaysOnTop ? "sim" : "não"}` : "Falha ao alterar always-on-top.");
    persistState();
  });
  ["#saveAvatarPosBtn", "#saveAvatarPosBtn2"].forEach((selector) => $(selector)?.addEventListener("click", async () => {
    const result = await window.noelleAPI?.saveAvatarPosition?.();
    showToast(result?.ok ? "Posição do avatar salva." : result?.error || "Abra o avatar primeiro.");
  }));

  $("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage($("#chatInput")?.value || "");
  });
  $("#chatInput")?.addEventListener("input", (event) => autosizeTextarea(event.currentTarget));
  $("#chatInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage(event.currentTarget.value);
    }
  });
  $("#micBtn")?.addEventListener("click", () => showToast("STT instalado pelo INICIAR.bat; captura de microfone fica para o próximo módulo."));
  $("#clearChatBtn")?.addEventListener("click", async () => {
    appState.messages = [{ role: "assistant", content: "Conversa limpa. Como posso ajudar?", at: Date.now() }];
    renderMessages();
    await persistState();
  });
  $("#saveMemoryBtn")?.addEventListener("click", async () => {
    const last = [...appState.messages].reverse().find((m) => m.role === "assistant");
    if (!last) return showToast("Nenhuma resposta para salvar.");
    appState.memories.push({ text: last.content.slice(0, 500), at: new Date().toISOString() });
    appState.memories = appState.memories.slice(-50);
    await persistState();
    showToast("Memória salva.");
  });

  $("#modelSelect")?.addEventListener("change", (e) => { appState.model = e.currentTarget.value; persistState(); });
  $("#profileSelect")?.addEventListener("change", (e) => { appState.profile = e.currentTarget.value; persistState(); refreshStatus({ quiet: true }); });
  $("#personaSelect")?.addEventListener("change", (e) => { appState.persona = e.currentTarget.value; persistState(); });
  $("#themeSelect")?.addEventListener("change", (e) => { applyTheme(e.currentTarget.value); persistState(); });
  $("#testTtsBtn")?.addEventListener("click", () => speakText("Olá, eu sou a Noelle. O sistema de voz está pronto."));
  $("#resetUiBtn")?.addEventListener("click", () => { applyTheme("noelle"); setPage("home"); showToast("Interface resetada."); });
  $("#copyDiagBtn")?.addEventListener("click", async () => {
    const status = await refreshStatus({ quiet: true });
    const assets = appState.assets;
    const text = JSON.stringify({ status, assets }, null, 2);
    await navigator.clipboard?.writeText(text);
    showToast("Diagnóstico copiado.");
  });
}

async function boot() {
  bindEvents();
  await loadSavedState();
  syncControlsFromState();
  renderMessages();
  await loadAssets();
  await refreshStatus({ quiet: true });
  setPage(appState.page || "home");
}

document.addEventListener("DOMContentLoaded", boot);


