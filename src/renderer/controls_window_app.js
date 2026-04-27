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
    {
      role: "assistant",
      content: "Oi! Como posso te ajudar hoje? A janela foi refeita com chat fixo, abas limpas e configurações recolhidas.",
      seconds: null,
      at: Date.now()
    }
  ],
  memories: []
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
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function setPage(page) {
  appState.page = page;
  $$(".page").forEach((el) => el.classList.toggle("active", el.dataset.page === page));
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.target === page));
  const titles = {
    home: "Principal",
    chat: "Chat IA",
    emotes: "Emotes",
    inventory: "Inventário",
    settings: "Configurações",
    about: "Sobre"
  };
  const subtitle = $("#topSubtitle");
  if (subtitle) subtitle.textContent = `${titles[page] || "Noelle"} · Noelle Companion 2026`;
  if (page === "chat") scrollChatToBottom();
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
    const speakButton = role === "assistant" ? `<button class="speak-btn" type="button" title="Leitura em voz preparada">🔊</button>` : "";

    item.innerHTML = `
      <div class="meta"><span>${escapeText(label)}${escapeText(timing)}</span><span class="time">${escapeText(msg.time || nowTime())}</span>${speakButton}</div>
      <div class="content">${escapeText(msg.content)}</div>
    `;
    log.appendChild(item);
  });

  $$(".speak-btn", log).forEach((btn) => {
    btn.addEventListener("click", () => showToast("Leitura em voz preparada para a próxima integração."));
  });

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const log = $("#chatLog");
  if (!log) return;
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
  });
}

function setChatStatus(text, detail = "") {
  const pill = $("#chatStatusPill");
  const detailEl = $("#chatDetailStatus");
  if (pill) pill.textContent = text;
  if (detailEl) detailEl.textContent = detail;
}

function setGlobalStatus(text) {
  const el = $("#globalStatus");
  if (el) el.textContent = text;
}

function autosizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 130) + "px";
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
        memories: Array.isArray(result.state.memories) ? result.state.memories : []
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
  if (!window.noelleAPI?.saveState) return;
  try {
    await window.noelleAPI.saveState({
      model: appState.model,
      profile: appState.profile,
      persona: appState.persona,
      theme: appState.theme,
      memories: appState.memories,
      messages: appState.messages.slice(-40)
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
  if (modelSelect) modelSelect.value = appState.model;
  if (profileSelect) profileSelect.value = appState.profile;
  if (personaSelect) personaSelect.value = appState.persona;
  if (themeSelect) themeSelect.value = appState.theme;
  applyTheme(appState.theme);
}

function applyTheme(theme) {
  appState.theme = theme || "noelle";
  document.body.classList.remove("theme-noelle", "theme-pbv", "theme-dark", "theme-light");
  document.body.classList.add(`theme-${appState.theme}`);
}

async function refreshStatus({ quiet = false } = {}) {
  if (!window.noelleAPI?.status) {
    setGlobalStatus("API indisponível");
    setChatStatus("IA indisponível", "preload não carregou");
    return null;
  }

  try {
    const status = await window.noelleAPI.status();
    const online = !!status?.ollama?.ok;
    const models = status?.ollama?.models || [];
    setGlobalStatus(online ? "Ollama online" : "Ollama offline");
    setChatStatus(online ? `IA online · ${appState.profile}` : "IA offline", online ? "Pronto." : "Abra o Ollama em 127.0.0.1:11434");
    if (!quiet) {
      const modelText = models.length ? `Modelos: ${models.slice(0, 6).join(", ")}` : status?.ollama?.error || "Nenhum modelo listado.";
      showToast(online ? `Ollama online. ${modelText}` : `Ollama offline: ${status?.ollama?.error || "sem resposta"}`);
    }
    return status;
  } catch (err) {
    setGlobalStatus("Erro no status");
    setChatStatus("IA com erro", String(err?.message || err));
    if (!quiet) showToast("Falha ao checar status.");
    return null;
  }
}

async function sendMessage() {
  const input = $("#chatInput");
  const text = input?.value.trim();
  if (!text) return;

  appState.model = $("#modelSelect")?.value || appState.model;
  appState.profile = $("#profileSelect")?.value || appState.profile;
  appState.persona = $("#personaSelect")?.value || appState.persona;

  appState.messages.push({ role: "user", content: text, at: Date.now(), time: nowTime() });
  input.value = "";
  autosizeTextarea(input);
  renderMessages();
  persistState();

  const sendBtn = $("#sendBtn");
  if (sendBtn) sendBtn.disabled = true;
  setChatStatus("IA pensando...", "Enviando para Ollama");

  try {
    const history = appState.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await window.noelleAPI.chat({
      message: text,
      history,
      model: appState.model,
      profile: appState.profile,
      persona: appState.persona
    });

    if (!result?.ok) {
      appState.messages.push({
        role: "system",
        content: `Falha na IA: ${result?.error || "erro desconhecido"}\n${result?.ollamaUrl ? "Ollama: " + result.ollamaUrl : ""}`,
        error: true,
        at: Date.now(),
        time: nowTime()
      });
      setChatStatus("IA offline/erro", result?.error || "erro");
    } else {
      appState.messages.push({
        role: "assistant",
        content: result.message,
        seconds: result.seconds,
        at: Date.now(),
        time: nowTime()
      });
      setChatStatus(`IA online · ${appState.profile}`, `Resposta em ${result.seconds}s`);
    }
  } catch (err) {
    appState.messages.push({ role: "system", content: `Erro interno: ${err?.message || err}`, error: true, at: Date.now(), time: nowTime() });
    setChatStatus("Erro interno", String(err?.message || err));
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    renderMessages();
    persistState();
  }
}

function clearChat() {
  appState.messages = [{ role: "assistant", content: "Conversa limpa. Pode mandar a próxima mensagem.", at: Date.now(), time: nowTime() }];
  renderMessages();
  persistState();
  showToast("Conversa limpa.");
}

function saveMemoryFromInput() {
  const input = $("#chatInput");
  const text = input?.value.trim();
  if (!text) {
    showToast("Digite uma memória no campo do chat antes de salvar.");
    return;
  }
  appState.memories.push({ text, at: new Date().toISOString() });
  input.value = "";
  autosizeTextarea(input);
  persistState();
  showToast("Memória salva para o chat.");
}

async function copyDiagnostics() {
  const status = await refreshStatus({ quiet: true });
  const text = JSON.stringify(status || { error: "sem status" }, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast("Diagnóstico copiado.");
  } catch (_) {
    showToast("Não consegui copiar. Veja o console.");
    console.log(text);
  }
}

function bindEvents() {
  $$(".nav-item").forEach((btn) => btn.addEventListener("click", () => setPage(btn.dataset.target)));
  $("#backToMenuBtn")?.addEventListener("click", () => setPage("home"));

  $$("[data-toast]").forEach((el) => el.addEventListener("click", () => showToast(el.dataset.toast)));

  $$(".segmented").forEach((group) => {
    group.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      $$('button', group).forEach((item) => item.classList.toggle("active", item === btn));
      showToast(`${btn.textContent.trim()} selecionado.`);
    });
  });

  const input = $("#chatInput");
  input?.addEventListener("input", () => autosizeTextarea(input));
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  $("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });

  $("#micBtn")?.addEventListener("click", () => showToast("STT/microfone fica para a próxima integração segura."));
  $("#statusBtn")?.addEventListener("click", () => refreshStatus({ quiet: false }));
  $("#clearChatBtn")?.addEventListener("click", clearChat);
  $("#saveMemoryBtn")?.addEventListener("click", saveMemoryFromInput);
  $("#copyDiagBtn")?.addEventListener("click", copyDiagnostics);

  ["modelSelect", "profileSelect", "personaSelect"].forEach((id) => {
    const el = $("#" + id);
    el?.addEventListener("change", () => {
      appState.model = $("#modelSelect")?.value || appState.model;
      appState.profile = $("#profileSelect")?.value || appState.profile;
      appState.persona = $("#personaSelect")?.value || appState.persona;
      persistState();
      setChatStatus(`IA ${appState.model}`, `Perfil ${appState.profile}`);
    });
  });

  $("#themeSelect")?.addEventListener("change", (event) => {
    applyTheme(event.target.value);
    persistState();
  });

  $("#reduceTransparency")?.addEventListener("change", (event) => {
    document.body.classList.toggle("reduced-transparency", event.target.checked);
    showToast(event.target.checked ? "Transparência reduzida." : "Transparência normal.");
  });
}

async function init() {
  bindEvents();
  await loadSavedState();
  syncControlsFromState();
  renderMessages();
  setPage("home");
  refreshStatus({ quiet: true });
}

window.addEventListener("DOMContentLoaded", init);


// NOELLE_UI_V12_SCROLL_FALLBACK
window.addEventListener('noelle:v12-chat-updated', () => {
  const log = document.getElementById('coreChatLog') || document.querySelector('.noelle-chat-v12-messages');
  if (log) requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
});
