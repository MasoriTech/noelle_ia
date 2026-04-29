(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_2_SETTINGS_ABOUT_CLEANUP";
  const ROOM_BUTTON_ID = "noelle-room-v19-single-launcher";
  const STYLE_ID = "noelle-v19-2-settings-about-style";
  const SETTINGS_KEY = "noelle.v19.settings";
  const INJECTED_SETTINGS = "noelleV192SettingsInjected";
  const INJECTED_ABOUT = "noelleV192AboutInjected";

  const SETTINGS_GROUPS = [
    {
      title: "Interface",
      items: [
        ["theme", "Tema", "select", ["Escuro", "Noelle", "Alto contraste"], "Escuro"],
        ["density", "Densidade da interface", "select", ["Confortável", "Compacta"], "Confortável"],
        ["fontSize", "Tamanho da fonte", "select", ["Pequena", "Média", "Grande"], "Média"],
        ["showRoomButton", "Mostrar botão Room V19", "toggle", null, true],
        ["roomButtonPosition", "Posição do botão Room V19", "select", ["Inferior direito", "Topbar", "Sidebar"], "Inferior direito"],
        ["rememberTab", "Lembrar última aba aberta", "toggle", null, true],
        ["openRoomAtStart", "Abrir Room junto com app", "toggle", null, false],
        ["openAvatarAtStart", "Abrir avatar/widget junto com app", "toggle", null, false],
        ["initialRoomMode", "Modo inicial da Room", "select", ["Build", "Yoru POV", "Third Person"], "Build"],
        ["safeLayout", "Evitar UI sobreposta/largura lotada", "toggle", null, true]
      ]
    },
    {
      title: "Avatar e Room",
      items: [
        ["mainAvatar", "Avatar principal", "select", ["Noelle.vrm", "Yoru.vrm", "Detectar automaticamente"], "Noelle.vrm"],
        ["roomPlayerAvatar", "Avatar player da Room", "select", ["Yoru", "Noelle", "Fallback"], "Yoru"],
        ["povEyeHeight", "Altura da câmera Yoru POV", "select", ["Baixa", "Normal", "Alta"], "Normal"],
        ["thirdDistance", "Distância Third Person", "select", ["Perto", "Médio", "Longe"], "Médio"],
        ["showBodyPov", "Mostrar corpo no Yoru POV", "toggle", null, false],
        ["yoruSpeed", "Velocidade da Yoru", "select", ["Lenta", "Normal", "Rápida"], "Normal"],
        ["jumpPower", "Força do pulo", "select", ["Baixa", "Normal", "Alta"], "Normal"],
        ["playerCollision", "Colisão do player", "toggle", null, true],
        ["roomAutosave", "Autosave da Room", "toggle", null, true],
        ["assetSafeMode", "Modo seguro de assets", "toggle", null, true]
      ]
    },
    {
      title: "Chat IA, áudio e manutenção",
      items: [
        ["defaultModel", "Modelo padrão", "select", ["qwen3:0.6b", "qwen3:1.7b", "Detectar pelo Ollama"], "qwen3:0.6b"],
        ["responseProfile", "Perfil de resposta", "select", ["Rápido", "Equilibrado", "Detalhado"], "Rápido"],
        ["persona", "Persona", "select", ["Séria", "Amigável", "Técnica", "Noelle"], "Séria"],
        ["checkOllamaStart", "Verificar Ollama ao iniciar", "toggle", null, true],
        ["startOllamaAuto", "Iniciar Ollama automaticamente", "toggle", null, true],
        ["ttsDefault", "TTS padrão", "select", ["Piper", "Windows SAPI", "Desligado"], "Piper"],
        ["sttDefault", "STT padrão", "select", ["faster-whisper", "Desligado"], "faster-whisper"],
        ["reloadManifests", "Recarregar manifests ao iniciar", "toggle", null, true],
        ["copyDiagnostics", "Copiar diagnóstico nas falhas", "toggle", null, true],
        ["oneBatOnly", "Manter apenas INICIAR.bat na raiz", "toggle", null, true]
      ]
    }
  ];

  const ABOUT_LINKS = [
    ["GitHub do projeto", "https://github.com/MasoriTech/noelle_ia"],
    ["VRoid Studio — criar avatar VRM", "https://vroid.com/en/studio"],
    ["Fab / Sketchfab — modelos 3D", "https://www.fab.com/"],
    ["Poly Haven — HDRI, texturas e modelos CC0", "https://polyhaven.com/"],
    ["OpenGameArt — assets livres", "https://opengameart.org/"],
    ["Mixamo — animações de corpo", "https://www.mixamo.com/"],
    ["VRM Consortium — formato VRM", "https://vrm-consortium.org/en/"]
  ];

  function log(...args) {
    console.log("[Noelle V19.2]", ...args);
  }

  function loadSettings() {
    try {
      return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
    } catch {
      return defaultSettings();
    }
  }

  function defaultSettings() {
    const out = {};
    for (const group of SETTINGS_GROUPS) {
      for (const [key, , , , fallback] of group.items) out[key] = fallback;
    }
    return out;
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings, null, 2));
    applySettings(settings);
  }

  function openExternal(url) {
    try {
      if (window.noelleAPI?.openExternal) return window.noelleAPI.openExternal(url);
      if (window.desktopWidget?.openExternal) return window.desktopWidget.openExternal(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("[Noelle V19.2] Falha ao abrir link:", err);
    }
  }

  function copyText(text) {
    try {
      navigator.clipboard?.writeText(text);
      toast("Copiado");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Copiado");
    }
  }

  function toast(message) {
    let el = document.getElementById("noelle-v19-2-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "noelle-v19-2-toast";
      el.className = "noelle-v19-2-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 1700);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --v19-card: rgba(15, 15, 26, .94);
        --v19-card-2: rgba(34, 25, 43, .88);
        --v19-line: rgba(255, 83, 136, .25);
        --v19-text: #fff4fb;
        --v19-muted: #c3b5cb;
        --v19-accent: #ff477e;
        --v19-accent-2: #8b5cf6;
        --v19-ok: #42f5ad;
      }
      body.noelle-v19-2-compact .v19-2-grid { gap: 10px; }
      body.noelle-v19-2-compact .v19-2-card { padding: 12px; border-radius: 16px; }
      body.noelle-v19-2-font-small { font-size: 92%; }
      body.noelle-v19-2-font-large { font-size: 110%; }
      body.noelle-v19-2-theme-noelle {
        background: radial-gradient(circle at 18% 0%, rgba(255,71,126,.18), transparent 34%), #090711;
      }
      body.noelle-v19-2-theme-contrast {
        filter: contrast(1.08);
      }
      .v19-2-root {
        margin: 18px 0 0;
        width: min(100%, 1180px);
      }
      .v19-2-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(265px, 1fr));
        gap: 14px;
        margin-top: 12px;
      }
      .v19-2-card {
        border: 1px solid var(--v19-line);
        background: var(--v19-card);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 18px 42px rgba(0,0,0,.18);
      }
      .v19-2-card h3 {
        margin: 0 0 12px;
        color: var(--v19-text);
        font-size: 18px;
      }
      .v19-2-card p, .v19-2-card li, .v19-2-card small {
        color: var(--v19-muted);
        line-height: 1.45;
      }
      .v19-2-setting {
        display: grid;
        grid-template-columns: 1fr minmax(120px, 190px);
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-top: 1px solid rgba(255,255,255,.06);
      }
      .v19-2-setting:first-of-type { border-top: 0; }
      .v19-2-setting label { color: var(--v19-muted); font-weight: 650; }
      .v19-2-setting select, .v19-2-setting input[type="checkbox"] {
        justify-self: end;
      }
      .v19-2-setting select {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: var(--v19-text);
        padding: 9px 10px;
        outline: none;
      }
      .v19-2-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .v19-2-actions button, .v19-2-link-button {
        border: 1px solid rgba(255,255,255,.13);
        color: var(--v19-text);
        background: rgba(255,255,255,.07);
        border-radius: 13px;
        padding: 9px 12px;
        font-weight: 800;
        cursor: pointer;
      }
      .v19-2-actions button.primary, .v19-2-link-button.primary {
        background: linear-gradient(135deg, var(--v19-accent), var(--v19-accent-2));
      }
      .v19-2-kbd {
        display: inline-block;
        border-radius: 8px;
        background: rgba(255,255,255,.08);
        color: var(--v19-text);
        padding: 2px 7px;
        font-family: ui-monospace, Consolas, monospace;
      }
      .v19-2-links {
        display: grid;
        gap: 8px;
      }
      .v19-2-status-table {
        display: grid;
        grid-template-columns: minmax(110px, 170px) 1fr;
        gap: 6px 12px;
        color: var(--v19-muted);
      }
      .v19-2-status-table b { color: var(--v19-text); }
      #${ROOM_BUTTON_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483600;
        border: 1px solid rgba(255,83,136,.55);
        border-radius: 999px;
        padding: 11px 16px;
        color: #fff;
        font-weight: 900;
        background: linear-gradient(135deg,#ff477e,#8b5cf6);
        box-shadow: 0 14px 44px rgba(0,0,0,.35);
        cursor: pointer;
      }
      #${ROOM_BUTTON_ID}.topbar { top: 14px; bottom: auto; }
      #${ROOM_BUTTON_ID}.sidebar { left: 22px; right: auto; bottom: 22px; }
      #${ROOM_BUTTON_ID}.hidden { display: none !important; }
      .noelle-v19-2-toast {
        position: fixed;
        left: 50%;
        top: 18px;
        transform: translateX(-50%);
        z-index: 2147483640;
        opacity: 0;
        pointer-events: none;
        transition: opacity .18s ease;
        border: 1px solid var(--v19-line);
        background: rgba(15,15,26,.94);
        color: var(--v19-text);
        border-radius: 999px;
        padding: 10px 14px;
        box-shadow: 0 16px 46px rgba(0,0,0,.30);
      }
      .noelle-v19-2-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function applySettings(settings = loadSettings()) {
    document.body.classList.toggle("noelle-v19-2-compact", settings.density === "Compacta");
    document.body.classList.toggle("noelle-v19-2-font-small", settings.fontSize === "Pequena");
    document.body.classList.toggle("noelle-v19-2-font-large", settings.fontSize === "Grande");
    document.body.classList.toggle("noelle-v19-2-theme-noelle", settings.theme === "Noelle");
    document.body.classList.toggle("noelle-v19-2-theme-contrast", settings.theme === "Alto contraste");

    const btn = document.getElementById(ROOM_BUTTON_ID);
    if (btn) {
      btn.classList.toggle("hidden", settings.showRoomButton === false);
      btn.classList.toggle("topbar", settings.roomButtonPosition === "Topbar");
      btn.classList.toggle("sidebar", settings.roomButtonPosition === "Sidebar");
    }
  }

  function isRoomButtonCandidate(el) {
    if (!el || el.id === ROOM_BUTTON_ID) return false;
    const text = String(el.textContent || "").trim();
    const id = String(el.id || "");
    return /Room\s*V19/i.test(text) || /room-v19-launcher/i.test(id) || /noelle-room-v19/i.test(id);
  }

  function dedupeRoomButtons() {
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button']"));
    for (const el of candidates) {
      if (isRoomButtonCandidate(el)) el.remove();
    }

    let btn = document.getElementById(ROOM_BUTTON_ID);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = ROOM_BUTTON_ID;
      btn.type = "button";
      btn.textContent = "🏠 Room V19";
      btn.title = "Abrir Noelle Room V19";
      btn.addEventListener("click", async () => {
        try {
          const api = window.noelleRoomV19 || window.noelleRoom;
          if (api?.open) await api.open();
          else toast("API da Room V19 não encontrada");
        } catch (err) {
          console.error("[Noelle V19.2] Falha ao abrir Room V19", err);
          toast("Falha ao abrir Room V19");
        }
      });
      document.body.appendChild(btn);
    }
    applySettings();
  }

  function getActivePageTitle() {
    const headings = Array.from(document.querySelectorAll("main h1, main h2, section h1, section h2, h1, h2"));
    for (const h of headings) {
      const text = String(h.textContent || "").trim();
      if (/^(Configurações|Sobre|Chat IA|Avatar|Emotes|Inventário|Principal)$/i.test(text)) return { text, node: h };
    }
    return { text: "", node: null };
  }

  function findInjectionRoot(titleNode) {
    if (!titleNode) return null;
    const candidates = [
      titleNode.closest("main"),
      titleNode.closest("[class*='content']"),
      titleNode.closest("[class*='page']"),
      titleNode.parentElement?.parentElement,
      titleNode.parentElement
    ].filter(Boolean);

    for (const node of candidates) {
      if (node && node !== document.body && node.querySelector) return node;
    }
    return document.body;
  }

  function injectSettingsPage(titleNode) {
    const root = findInjectionRoot(titleNode);
    if (!root || root.dataset[INJECTED_SETTINGS] === "1") return;
    root.dataset[INJECTED_SETTINGS] = "1";

    const settings = loadSettings();
    const wrap = document.createElement("section");
    wrap.className = "v19-2-root";
    wrap.id = "noelle-v19-2-settings-panel";

    const header = document.createElement("div");
    header.className = "v19-2-card";
    header.innerHTML = `
      <h3>Configurações avançadas V19.2</h3>
      <p>Essas opções organizam interface, Room, Yoru, Chat IA, áudio e assets sem mexer no layout do Chat IA que já está bom.</p>
      <div class="v19-2-actions">
        <button class="primary" data-action="save-settings">Salvar configurações</button>
        <button data-action="reset-settings">Resetar V19.2</button>
        <button data-action="copy-settings">Copiar diagnóstico</button>
        <button data-action="open-room">Abrir Room V19</button>
      </div>
    `;
    wrap.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "v19-2-grid";

    for (const group of SETTINGS_GROUPS) {
      const card = document.createElement("div");
      card.className = "v19-2-card";
      card.innerHTML = `<h3>${group.title}</h3>`;

      for (const [key, label, type, choices, fallback] of group.items) {
        const row = document.createElement("div");
        row.className = "v19-2-setting";

        if (type === "toggle") {
          row.innerHTML = `
            <label for="v19-setting-${key}">${label}</label>
            <input id="v19-setting-${key}" data-setting="${key}" type="checkbox" ${settings[key] === false ? "" : "checked"} />
          `;
        } else {
          const opts = (choices || []).map((choice) => `<option value="${choice}" ${String(settings[key] ?? fallback) === choice ? "selected" : ""}>${choice}</option>`).join("");
          row.innerHTML = `
            <label for="v19-setting-${key}">${label}</label>
            <select id="v19-setting-${key}" data-setting="${key}">${opts}</select>
          `;
        }

        card.appendChild(row);
      }

      grid.appendChild(card);
    }

    wrap.appendChild(grid);

    wrap.addEventListener("change", (event) => {
      const el = event.target;
      const key = el?.dataset?.setting;
      if (!key) return;
      const next = loadSettings();
      next[key] = el.type === "checkbox" ? !!el.checked : el.value;
      saveSettings(next);
    });

    wrap.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;

      if (action === "save-settings") {
        saveSettings(loadSettings());
        toast("Configurações salvas");
      }

      if (action === "reset-settings") {
        localStorage.removeItem(SETTINGS_KEY);
        toast("Configurações V19.2 resetadas");
        root.dataset[INJECTED_SETTINGS] = "";
        wrap.remove();
        setTimeout(() => injectSettingsPage(titleNode), 50);
      }

      if (action === "copy-settings") {
        copyText(createDiagnosticsText());
      }

      if (action === "open-room") {
        try {
          await (window.noelleRoomV19 || window.noelleRoom)?.open?.();
        } catch (err) {
          console.error(err);
          toast("Falha ao abrir Room");
        }
      }
    });

    root.appendChild(wrap);
  }

  function createDiagnosticsText() {
    const settings = loadSettings();
    const status = {
      patch: PATCH_ID,
      href: location.href,
      roomApi: !!(window.noelleRoomV19 || window.noelleRoom),
      noelleApi: !!window.noelleAPI,
      settings,
      time: new Date().toISOString()
    };
    return JSON.stringify(status, null, 2);
  }

  function injectAboutPage(titleNode) {
    const root = findInjectionRoot(titleNode);
    if (!root || root.dataset[INJECTED_ABOUT] === "1") return;
    root.dataset[INJECTED_ABOUT] = "1";

    const wrap = document.createElement("section");
    wrap.className = "v19-2-root";
    wrap.id = "noelle-v19-2-about-panel";

    wrap.innerHTML = `
      <div class="v19-2-grid">
        <article class="v19-2-card">
          <h3>Noelle Companion 2026</h3>
          <p>Companion local feito com Electron, Three.js, VRM, Ollama, STT/TTS e Room 3D.</p>
          <ul>
            <li>Chat IA local com Ollama.</li>
            <li>Avatar/widget VRM com Noelle/Yoru.</li>
            <li>Emotes VRMA, expressions PNG e items GLB.</li>
            <li>Room V19 com Build, Yoru POV, Third Person, pulo e câmera livre.</li>
          </ul>
        </article>

        <article class="v19-2-card">
          <h3>Arquivos e formatos</h3>
          <div class="v19-2-status-table">
            <b>VRM</b><span><span class="v19-2-kbd">src/assets/Noelle.vrm</span> e <span class="v19-2-kbd">src/assets/avatars/*.vrm</span></span>
            <b>VRMA</b><span><span class="v19-2-kbd">src/assets/motions/*.vrma</span></span>
            <b>PNG</b><span><span class="v19-2-kbd">src/assets/expressions/*.png</span></span>
            <b>GLB</b><span><span class="v19-2-kbd">src/assets/items/*.glb</span></span>
            <b>JSON</b><span>manifests, layouts e configurações.</span>
          </div>
        </article>

        <article class="v19-2-card">
          <h3>Links úteis</h3>
          <div class="v19-2-links" id="v19-about-links"></div>
        </article>

        <article class="v19-2-card">
          <h3>Regras de assets</h3>
          <ul>
            <li>Usar assets com licença clara.</li>
            <li>Preferir CC0, MIT, permissiva ou asset comprado/licenciado.</li>
            <li>Guardar créditos quando a licença pedir.</li>
            <li>Otimizar GLB/VRM antes de importar.</li>
            <li>Usar nomes simples: <span class="v19-2-kbd">office_desk.glb</span>, <span class="v19-2-kbd">yoru_idle.vrma</span>.</li>
          </ul>
        </article>

        <article class="v19-2-card">
          <h3>Tecnologias</h3>
          <p>Electron, Node.js, Three.js, @pixiv/three-vrm, Ollama, Piper TTS e faster-whisper STT.</p>
          <div class="v19-2-actions">
            <button class="primary" data-action="copy-about-diagnostics">Copiar diagnóstico</button>
            <button data-action="open-github">Abrir GitHub</button>
            <button data-action="open-room">Abrir Room V19</button>
          </div>
        </article>

        <article class="v19-2-card">
          <h3>Status esperado</h3>
          <div class="v19-2-status-table">
            <b>Chat IA</b><span>Ollama online/offline com diagnóstico rápido.</span>
            <b>Avatar</b><span>Noelle/Yoru encontrados e widget abrindo.</span>
            <b>Room</b><span>Bundle carregado e botão único Room V19.</span>
            <b>Emotes</b><span>Motions VRMA encontradas.</span>
            <b>Items</b><span>GLBs encontrados e manifest carregado.</span>
            <b>Áudio</b><span>Piper/SAPI e STT com fallback.</span>
          </div>
        </article>
      </div>
    `;

    root.appendChild(wrap);

    const linkBox = wrap.querySelector("#v19-about-links");
    if (linkBox) {
      for (const [label, url] of ABOUT_LINKS) {
        const button = document.createElement("button");
        button.className = "v19-2-link-button";
        button.textContent = label;
        button.type = "button";
        button.addEventListener("click", () => openExternal(url));
        linkBox.appendChild(button);
      }
    }

    wrap.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (action === "copy-about-diagnostics") copyText(createDiagnosticsText());
      if (action === "open-github") openExternal("https://github.com/MasoriTech/noelle_ia");
      if (action === "open-room") (window.noelleRoomV19 || window.noelleRoom)?.open?.();
    });
  }

  let scheduled = false;
  function scanAndEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      injectStyles();
      dedupeRoomButtons();

      const { text, node } = getActivePageTitle();
      if (/^Configurações$/i.test(text)) injectSettingsPage(node);
      if (/^Sobre$/i.test(text)) injectAboutPage(node);
    });
  }

  function start() {
    injectStyles();
    dedupeRoomButtons();
    applySettings();
    scanAndEnhance();

    const observer = new MutationObserver(scanAndEnhance);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("storage", () => applySettings(loadSettings()));
    log("ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
