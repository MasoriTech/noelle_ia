"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const api = window.noelleAPI || window.desktopWidget || {};

const appState = {
  page: "home",
  model: "qwen3:0.6b",
  profile: "rapido",
  persona: "nobre",
  theme: "noelle",
  selectedExpression: null,
  messages: [
    {
      role: "assistant",
      content: "Oi! Eu sou a Noelle. A janela agora usa layout estável, Chat IA fixo e emotes carregados de src/assets/expressions.",
      seconds: null,
      at: Date.now(),
    },
  ],
  memories: [],
  expressions: [],
};

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function showToast(text) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = String(text || "");
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
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
  const titles = { home: "Principal", chat: "Chat IA", emotes: "Emotes", inventory: "Inventário", settings: "Configurações", about: "Sobre" };
  const title = $("#topTitle");
  if (title) title.textContent = titles[page] || "Noelle";
  if (page === "chat") scrollChatToBottom();
  if (page === "emotes") renderExpressions();
}

function renderMessages() {
  const log = $("#chatLog");
  if (!log) return;
  log.innerHTML = "";
  appState.messages.forEach((msg) => {
    const item = document.createElement("article");
    const role = msg.role === "user" || msg.role === "assistant" || msg.role === "system" ? msg.role : "system";
    item.className = `message ${role}${msg.error ? " error" : ""}`;
    const label = role === "user" ? "Você" : role === "assistant" ? "Noelle" : "Sistema";
    const timing = msg.seconds ? ` · ${msg.seconds}s` : "";
    item.innerHTML = `
      <div class="meta"><span>${escapeText(label)}${escapeText(timing)}</span><span class="time">${escapeText(msg.time || nowTime())}</span></div>
      <div class="body">${escapeText(msg.content)}</div>
    `;
    log.appendChild(item);
  });
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const log = $("#chatLog");
  if (!log) return;
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
}

function setChatStatus(text, detail = "") {
  const pill = $("#chatStatusPill");
  const detailEl = $("#chatDetailStatus");
  if (pill) pill.textContent = text;
  if (detailEl) detailEl.textContent = detail;
}

function setGlobalStatus(text, state = "warn") {
  const el = $("#globalStatus");
  const sidebar = $("#sidebarStatus");
  const detail = $("#sidebarDetail");
  const dot = $("#sidebarDot");
  if (el) el.textContent = text;
  if (sidebar) sidebar.textContent = text;
  if (detail) detail.textContent = state === "online" ? "Ollama pronto" : state === "offline" ? "Verifique o Ollama" : "Aguardando";
  if (dot) {
    dot.classList.remove("online", "offline");
    if (state === "online") dot.classList.add("online");
    if (state === "offline") dot.classList.add("offline");
  }
}

function autosizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 130) + "px";
}

async function loadSavedState() {
  if (!api.loadState) return;
  try {
    const result = await api.loadState();
    if (result?.ok && result.state) {
      Object.assign(appState, {
        model: result.state.model || appState.model,
        profile: result.state.profile || appState.profile,
        persona: result.state.persona || appState.persona,
        theme: result.state.theme || appState.theme,
        selectedExpression: result.state.selectedExpression || appState.selectedExpression,
        memories: Array.isArray(result.state.memories) ? result.state.memories : [],
      });
      if (Array.isArray(result.state.messages) && result.state.messages.length) {
        appState.messages = result.state.messages;
      }
    }
  } catch (err) {
    console.warn("Falha ao carregar estado:", err);
  }
}

async function persistState() {
  if (!api.saveState) return;
  try {
    await api.saveState({
      model: appState.model,
      profile: appState.profile,
      persona: appState.persona,
      theme: appState.theme,
      selectedExpression: appState.selectedExpression,
      memories: appState.memories,
      messages: appState.messages.slice(-50),
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
  else appState.model = "qwen3:0.6b";
  if (selectHasValue(profileSelect, appState.profile)) profileSelect.value = appState.profile;
  else appState.profile = "rapido";
  if (selectHasValue(personaSelect, appState.persona)) personaSelect.value = appState.persona;
  else appState.persona = "nobre";
  if (selectHasValue(themeSelect, appState.theme)) themeSelect.value = appState.theme;
  else appState.theme = "noelle";
  applyTheme(appState.theme);
}

function applyTheme(theme) {
  appState.theme = theme || "noelle";
  document.body.classList.remove("theme-noelle", "theme-pbv", "theme-dark", "theme-light");
  document.body.classList.add(`theme-${appState.theme}`);
}

async function refreshStatus({ quiet = false } = {}) {
  if (!api.status) {
    setGlobalStatus("API indisponível", "offline");
    setChatStatus("IA indisponível", "preload não carregou");
    return null;
  }
  try {
    const status = await api.status();
    const online = !!status?.ollama?.ok;
    const models = status?.ollama?.models || [];
    setGlobalStatus(online ? "Ollama online" : "Ollama offline", online ? "online" : "offline");
    setChatStatus(online ? `IA online · ${appState.profile}` : "IA offline", online ? "Pronto." : "Abra o Ollama em 127.0.0.1:11434");
    if (!quiet) {
      const modelText = models.length ? `Modelos: ${models.slice(0, 6).join(", ")}` : status?.ollama?.error || "Nenhum modelo listado.";
      showToast(online ? `Ollama online. ${modelText}` : `Ollama offline. ${modelText}`);
    }
    if (Array.isArray(status?.expressions)) {
      appState.expressions = status.expressions;
      renderExpressions();
    }
    return status;
  } catch (err) {
    setGlobalStatus("Diagnóstico falhou", "offline");
    setChatStatus("IA indisponível", err.message || String(err));
    if (!quiet) showToast("Falha no diagnóstico: " + (err.message || err));
    return null;
  }
}

async function sendChatMessage() {
  const input = $("#chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autosizeTextarea(input);
  const history = appState.messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-12).map((m) => ({ role: m.role, content: m.content }));
  appState.messages.push({ role: "user", content: text, at: Date.now(), time: nowTime() });
  renderMessages();
  setChatStatus("Noelle pensando...", "Gerando resposta local.");
  const sendBtn = $("#sendBtn");
  if (sendBtn) sendBtn.disabled = true;
  try {
    const result = await api.chat({ message: text, model: appState.model, profile: appState.profile, persona: appState.persona, history });
    if (!result?.ok) {
      appState.messages.push({ role: "system", content: result?.error || "Falha ao conversar com a IA.", error: true, at: Date.now(), time: nowTime() });
      setChatStatus("IA com erro", result?.error || "Verifique o diagnóstico.");
    } else {
      appState.messages.push({ role: "assistant", content: result.message, seconds: result.seconds, at: Date.now(), time: nowTime() });
      setChatStatus(`IA online · ${appState.profile}`, `Resposta em ${result.seconds}s`);
    }
    await persistState();
  } catch (err) {
    appState.messages.push({ role: "system", content: "Erro no chat: " + (err.message || err), error: true, at: Date.now(), time: nowTime() });
    setChatStatus("IA com erro", err.message || String(err));
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    renderMessages();
  }
}

async function loadExpressions() {
  const grid = $("#expressionGrid");
  const status = $("#expressionStatus");
  if (status) status.textContent = "Carregando expressões...";
  try {
    const result = api.listExpressions ? await api.listExpressions() : null;
    appState.expressions = Array.isArray(result?.expressions) ? result.expressions : [];
    renderExpressions();
    if (status) status.textContent = appState.expressions.length ? `${appState.expressions.length} expressões carregadas` : "Nenhuma expressão encontrada";
  } catch (err) {
    if (grid) grid.innerHTML = `<p class="muted">Falha ao carregar expressões: ${escapeText(err.message || err)}</p>`;
    if (status) status.textContent = "Erro nas expressões";
  }
}

function renderExpressions() {
  const grid = $("#expressionGrid");
  const status = $("#expressionStatus");
  if (!grid) return;
  const showToggle = $("#showExpressionsToggle");
  if (showToggle && !showToggle.checked) {
    grid.innerHTML = `<p class="muted">Expressões ocultas nas configurações.</p>`;
    if (status) status.textContent = "Expressões ocultas";
    return;
  }
  const expressions = Array.isArray(appState.expressions) ? appState.expressions : [];
  if (!expressions.length) {
    grid.innerHTML = `<p class="muted">Nenhuma expressão encontrada em src/assets/expressions.</p>`;
    if (status) status.textContent = "Nenhuma expressão encontrada";
    return;
  }
  grid.innerHTML = "";
  expressions.forEach((expr) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tile expression-tile${expr.exists === false ? " missing" : ""}${appState.selectedExpression === expr.id ? " active" : ""}`;
    button.dataset.expressionId = expr.id;
    button.innerHTML = `
      <img src="${escapeText(expr.src)}" alt="${escapeText(expr.label)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <span style="display:none">☺</span>
      <strong>${escapeText(expr.label)}</strong>
      <small>${expr.exists === false ? "arquivo ausente" : "expressão Noelle"}</small>
    `;
    button.addEventListener("click", () => applyExpression(expr.id));
    grid.appendChild(button);
  });
  if (status) status.textContent = `${expressions.length} expressões carregadas`;
}

async function applyExpression(id) {
  const expr = appState.expressions.find((item) => item.id === id);
  appState.selectedExpression = id;
  renderExpressions();
  try {
    if (api.applyExpression) await api.applyExpression(id);
    await persistState();
    showToast(expr ? `Expressão aplicada: ${expr.label}` : "Expressão aplicada");
  } catch (err) {
    showToast("Falha ao aplicar expressão: " + (err.message || err));
  }
}

async function copyDiagnostic() {
  const status = await refreshStatus({ quiet: true });
  const text = JSON.stringify({ at: new Date().toISOString(), status, state: appState }, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast("Diagnóstico copiado.");
  } catch {
    console.log(text);
    showToast("Não consegui copiar. Diagnóstico foi enviado ao console.");
  }
}

function bindEvents() {
  $$(".nav-item[data-target]").forEach((btn) => btn.addEventListener("click", () => setPage(btn.dataset.target)));
  $$("[data-toast]").forEach((btn) => btn.addEventListener("click", () => showToast(btn.dataset.toast)));
  const form = $("#chatForm");
  if (form) form.addEventListener("submit", (event) => { event.preventDefault(); sendChatMessage(); });
  const input = $("#chatInput");
  if (input) {
    input.addEventListener("input", () => autosizeTextarea(input));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
      }
    });
  }
  $("#micBtn")?.addEventListener("click", () => showToast("STT preparado. Instale as dependências Python pelo INICIAR.bat."));
  $("#refreshStatusBtn")?.addEventListener("click", () => refreshStatus());
  $("#statusBtn")?.addEventListener("click", () => refreshStatus());
  $("#clearChatBtn")?.addEventListener("click", async () => {
    appState.messages = [{ role: "assistant", content: "Conversa limpa. Pode mandar a próxima mensagem.", at: Date.now(), time: nowTime() }];
    renderMessages();
    await persistState();
  });
  $("#saveMemoryBtn")?.addEventListener("click", async () => {
    const lastUser = [...appState.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return showToast("Nenhuma mensagem sua para salvar como memória.");
    appState.memories.push({ text: lastUser.content, at: new Date().toISOString() });
    appState.memories = appState.memories.slice(-60);
    await persistState();
    showToast("Memória salva.");
  });
  $("#reloadExpressionsBtn")?.addEventListener("click", () => loadExpressions());
  $("#copyDiagBtn")?.addEventListener("click", () => copyDiagnostic());
  $("#resetUiBtn")?.addEventListener("click", async () => {
    appState.theme = "noelle";
    appState.selectedExpression = null;
    applyTheme("noelle");
    syncControlsFromState();
    renderExpressions();
    await persistState();
    showToast("Interface resetada.");
  });
  $("#modelSelect")?.addEventListener("change", (event) => { appState.model = event.target.value; persistState(); });
  $("#profileSelect")?.addEventListener("change", (event) => { appState.profile = event.target.value; persistState(); refreshStatus({ quiet: true }); });
  $("#personaSelect")?.addEventListener("change", (event) => { appState.persona = event.target.value; persistState(); });
  $("#themeSelect")?.addEventListener("change", (event) => { applyTheme(event.target.value); persistState(); });
  $("#reduceTransparencyToggle")?.addEventListener("change", (event) => document.body.classList.toggle("reduced-transparency", event.target.checked));
  $("#showExpressionsToggle")?.addEventListener("change", () => renderExpressions());
}

async function bootstrap() {
  bindEvents();
  await loadSavedState();
  syncControlsFromState();
  renderMessages();
  await loadExpressions();
  await refreshStatus({ quiet: true });
  setPage(appState.page);
}

window.addEventListener("DOMContentLoaded", bootstrap);
