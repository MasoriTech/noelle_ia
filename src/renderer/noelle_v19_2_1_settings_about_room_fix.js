(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_2_1_SETTINGS_ABOUT_ROOM_FIX";
  const ROOM_BUTTON_ID = "noelle-room-v19-canonical-button";
  const STYLE_ID = "noelle-v19-2-1-style";
  const SETTINGS_KEY = "noelle.v19.settings";
  const PANEL_ATTR = "data-noelle-v19-2-1-panel";

  const CONFIG_GROUPS = [
    {
      title: "Interface",
      items: [
        ["theme", "Tema", "select", ["Escuro", "Noelle", "Alto contraste"], "Escuro"],
        ["density", "Densidade da interface", "select", ["Confortável", "Compacta"], "Confortável"],
        ["fontSize", "Tamanho da fonte", "select", ["Pequena", "Média", "Grande"], "Média"],
        ["showRoomButton", "Mostrar botão Room V19", "toggle", null, true],
        ["roomButtonPosition", "Posição do botão Room V19", "select", ["Inferior direito", "Topbar", "Sidebar"], "Inferior direito"],
        ["rememberLastTab", "Lembrar última aba aberta", "toggle", null, true],
        ["openRoomAtStart", "Abrir Room junto com app", "toggle", null, false],
        ["openAvatarAtStart", "Abrir avatar/widget junto com app", "toggle", null, false],
        ["initialRoomMode", "Modo inicial da Room", "select", ["Build", "Yoru POV", "Third Person"], "Build"],
        ["safeUiMode", "Modo anti-sobreposição de UI", "toggle", null, true]
      ]
    },
    {
      title: "Avatar e Room",
      items: [
        ["mainAvatar", "Avatar principal", "select", ["Noelle.vrm", "Yoru.vrm", "Detectar automaticamente"], "Noelle.vrm"],
        ["roomAvatar", "Avatar player da Room", "select", ["Yoru", "Noelle", "Fallback"], "Yoru"],
        ["povEyeHeight", "Altura da câmera Yoru POV", "select", ["Baixa", "Normal", "Alta"], "Normal"],
        ["thirdPersonDistance", "Distância Third Person", "select", ["Perto", "Médio", "Longe"], "Médio"],
        ["showBodyInPov", "Mostrar corpo no Yoru POV", "toggle", null, false],
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
        ["copyDiagnosticsOnError", "Copiar diagnóstico nas falhas", "toggle", null, true],
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

  function defaultSettings() {
    const out = {};
    for (const group of CONFIG_GROUPS) {
      for (const [key, , , , fallback] of group.items) out[key] = fallback;
    }
    return out;
  }

  function loadSettings() {
    try {
      return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
    } catch {
      return defaultSettings();
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings, null, 2));
    applySettings(settings);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --v1921-bg: rgba(14, 14, 25, .96);
        --v1921-bg2: rgba(34, 25, 43, .92);
        --v1921-line: rgba(255, 83, 136, .26);
        --v1921-text: #fff4fb;
        --v1921-muted: #c7b8cf;
        --v1921-accent: #ff477e;
        --v1921-accent2: #8b5cf6;
        --v1921-ok: #42f5ad;
      }
      body.noelle-v19-2-compact .v1921-grid { gap: 10px; }
      body.noelle-v19-2-compact .v1921-card { padding: 12px; }
      body.noelle-v19-2-font-small { font-size: 92%; }
      body.noelle-v19-2-font-large { font-size: 108%; }
      body.noelle-v19-2-theme-noelle {
        background: radial-gradient(circle at 20% 0%, rgba(255,71,126,.18), transparent 30%), #090711 !important;
      }
      body.noelle-v19-2-theme-contrast { filter: contrast(1.08); }
      .v1921-root {
        width: min(100%, 1180px);
        margin: 18px 0;
      }
      .v1921-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
        align-items: start;
      }
      .v1921-card {
        border: 1px solid var(--v1921-line);
        background: var(--v1921-bg);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 16px 42px rgba(0,0,0,.20);
      }
      .v1921-card h3 {
        margin: 0 0 10px;
        color: var(--v1921-text);
        font-size: 18px;
      }
      .v1921-card p, .v1921-card li, .v1921-card span {
        color: var(--v1921-muted);
        line-height: 1.45;
      }
      .v1921-setting {
        display: grid;
        grid-template-columns: 1fr minmax(118px, 190px);
        align-items: center;
        gap: 10px;
        border-top: 1px solid rgba(255,255,255,.07);
        padding: 8px 0;
      }
      .v1921-setting:first-of-type { border-top: none; }
      .v1921-setting label {
        color: var(--v1921-muted);
        font-weight: 700;
      }
      .v1921-setting select {
        width: 100%;
        color: var(--v1921-text);
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 12px;
        padding: 9px 10px;
        outline: none;
      }
      .v1921-setting input[type="checkbox"] {
        justify-self: end;
        width: 22px;
        height: 22px;
      }
      .v1921-actions, .v1921-links {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .v1921-links { display: grid; }
      .v1921-btn {
        border: 1px solid rgba(255,255,255,.14);
        color: var(--v1921-text);
        background: rgba(255,255,255,.08);
        border-radius: 13px;
        padding: 9px 12px;
        font-weight: 850;
        cursor: pointer;
      }
      .v1921-btn.primary {
        background: linear-gradient(135deg, var(--v1921-accent), var(--v1921-accent2));
      }
      .v1921-kbd {
        display: inline-block;
        border-radius: 8px;
        background: rgba(255,255,255,.09);
        color: var(--v1921-text);
        padding: 2px 7px;
        font-family: ui-monospace, Consolas, monospace;
      }
      .v1921-table {
        display: grid;
        grid-template-columns: minmax(115px, 170px) 1fr;
        gap: 7px 12px;
      }
      .v1921-table b { color: var(--v1921-text); }
      #${ROOM_BUTTON_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483500;
        border: 1px solid rgba(255,83,136,.55);
        border-radius: 999px;
        padding: 11px 17px;
        color: #fff;
        font-weight: 950;
        background: linear-gradient(135deg,#ff477e,#8b5cf6);
        box-shadow: 0 15px 44px rgba(0,0,0,.38);
        cursor: pointer;
      }
      #${ROOM_BUTTON_ID}.topbar { top: 15px; bottom: auto; }
      #${ROOM_BUTTON_ID}.sidebar { left: 22px; right: auto; bottom: 22px; }
      #${ROOM_BUTTON_ID}.hidden { display: none !important; }
      .v1921-toast {
        position: fixed;
        top: 17px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483600;
        opacity: 0;
        pointer-events: none;
        transition: opacity .18s ease;
        border: 1px solid var(--v1921-line);
        border-radius: 999px;
        background: rgba(14,14,25,.96);
        color: var(--v1921-text);
        padding: 10px 14px;
        box-shadow: 0 16px 44px rgba(0,0,0,.28);
      }
      .v1921-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function toast(message) {
    let el = document.querySelector(".v1921-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "v1921-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 1700);
  }

  function openExternal(url) {
    try {
      if (window.noelleAPI?.openExternal) return window.noelleAPI.openExternal(url);
      if (window.desktopWidget?.openExternal) return window.desktopWidget.openExternal(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("[Noelle V19.2.1] Falha ao abrir link", err);
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

  function looksLikeFloatingRoomButton(el) {
    if (!el || el.id === ROOM_BUTTON_ID) return false;
    const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
    const id = String(el.id || "");
    const cls = String(el.className || "");
    const style = window.getComputedStyle(el);
    const isFloating = style.position === "fixed" || style.position === "absolute" || /floating|launcher|room-v19|room/i.test(id + " " + cls);
    const isRoomText = /^🏠?\s*Room(\s*V19)?$/i.test(text) || /^Room(\s*V19)?$/i.test(text);
    return isRoomText && isFloating;
  }

  function cleanupRoomButtons() {
    const elements = Array.from(document.querySelectorAll("button, a, [role='button'], div"));
    for (const el of elements) {
      if (looksLikeFloatingRoomButton(el)) el.remove();
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
          else toast("API Room V19 não encontrada");
        } catch (err) {
          console.error("[Noelle V19.2.1] Falha ao abrir Room", err);
          toast("Falha ao abrir Room");
        }
      });
      document.body.appendChild(btn);
    }

    applySettings();
  }

  function allVisibleText() {
    return String(document.body?.innerText || "");
  }

  function isSettingsPage() {
    const text = allVisibleText();
    return /\bConfigurações\b/i.test(text) && /Tema e interface/i.test(text);
  }

  function isAboutPage() {
    const text = allVisibleText();
    return /\bSobre\b/i.test(text) && /Noelle Companion/i.test(text) && /Avatar:/i.test(text);
  }

  function findContentHost() {
    const headers = Array.from(document.querySelectorAll("h1, h2, h3"));
    const pageHeader = headers.find((h) => /^(Configurações|Sobre)$/i.test(String(h.textContent || "").trim()));
    if (pageHeader) {
      const candidates = [
        pageHeader.closest("main"),
        pageHeader.closest("section"),
        pageHeader.parentElement?.parentElement,
        pageHeader.parentElement
      ].filter(Boolean);
      for (const candidate of candidates) {
        if (candidate && candidate !== document.body && candidate.querySelector) return candidate;
      }
    }

    const likely = Array.from(document.querySelectorAll("main, [class*='content'], [class*='page'], section"))
      .filter((el) => el.offsetWidth > 450 && el.offsetHeight > 250)
      .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];

    return likely || document.body;
  }

  function removeWrongPanel(type) {
    for (const el of Array.from(document.querySelectorAll(`[${PANEL_ATTR}]`))) {
      if (el.getAttribute(PANEL_ATTR) !== type) el.remove();
    }
  }

  function createDiagnostics() {
    return JSON.stringify({
      patch: PATCH_ID,
      time: new Date().toISOString(),
      roomApi: !!(window.noelleRoomV19 || window.noelleRoom),
      noelleApi: !!window.noelleAPI,
      settings: loadSettings(),
      location: location.href
    }, null, 2);
  }

  function ensureSettingsPanel() {
    removeWrongPanel("settings");
    if (document.querySelector(`[${PANEL_ATTR}="settings"]`)) return;

    const host = findContentHost();
    const settings = loadSettings();

    const root = document.createElement("section");
    root.className = "v1921-root";
    root.setAttribute(PANEL_ATTR, "settings");

    const intro = document.createElement("article");
    intro.className = "v1921-card";
    intro.innerHTML = `
      <h3>Configurações avançadas V19.2.1</h3>
      <p>Opções úteis para interface, Room, Yoru, Chat IA, áudio e manutenção. A aba Chat IA foi preservada com alterações mínimas.</p>
      <div class="v1921-actions">
        <button class="v1921-btn primary" data-action="save">Salvar</button>
        <button class="v1921-btn" data-action="reset">Resetar V19.2.1</button>
        <button class="v1921-btn" data-action="copy">Copiar diagnóstico</button>
        <button class="v1921-btn" data-action="room">Abrir Room V19</button>
      </div>
    `;
    root.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "v1921-grid";

    for (const group of CONFIG_GROUPS) {
      const card = document.createElement("article");
      card.className = "v1921-card";
      card.innerHTML = `<h3>${group.title}</h3>`;

      for (const [key, label, type, choices, fallback] of group.items) {
        const row = document.createElement("div");
        row.className = "v1921-setting";
        if (type === "toggle") {
          row.innerHTML = `<label for="v1921-${key}">${label}</label><input id="v1921-${key}" data-key="${key}" type="checkbox" ${settings[key] === false ? "" : "checked"} />`;
        } else {
          const options = choices.map((choice) => `<option value="${choice}" ${String(settings[key] ?? fallback) === choice ? "selected" : ""}>${choice}</option>`).join("");
          row.innerHTML = `<label for="v1921-${key}">${label}</label><select id="v1921-${key}" data-key="${key}">${options}</select>`;
        }
        card.appendChild(row);
      }

      grid.appendChild(card);
    }

    root.appendChild(grid);

    root.addEventListener("change", (event) => {
      const key = event.target?.dataset?.key;
      if (!key) return;
      const next = loadSettings();
      next[key] = event.target.type === "checkbox" ? !!event.target.checked : event.target.value;
      saveSettings(next);
    });

    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "save") {
        saveSettings(loadSettings());
        toast("Configurações salvas");
      }
      if (action === "reset") {
        localStorage.removeItem(SETTINGS_KEY);
        document.querySelector(`[${PANEL_ATTR}="settings"]`)?.remove();
        ensureSettingsPanel();
        toast("Configurações resetadas");
      }
      if (action === "copy") copyText(createDiagnostics());
      if (action === "room") {
        try { await (window.noelleRoomV19 || window.noelleRoom)?.open?.(); }
        catch { toast("Falha ao abrir Room"); }
      }
    });

    host.appendChild(root);
  }

  function ensureAboutPanel() {
    removeWrongPanel("about");
    if (document.querySelector(`[${PANEL_ATTR}="about"]`)) return;

    const host = findContentHost();
    const root = document.createElement("section");
    root.className = "v1921-root";
    root.setAttribute(PANEL_ATTR, "about");

    root.innerHTML = `
      <div class="v1921-grid">
        <article class="v1921-card">
          <h3>Noelle Companion 2026</h3>
          <p>Companion local feito com Electron, Three.js, VRM, Ollama, STT/TTS e Room 3D.</p>
          <ul>
            <li>Chat IA local com Ollama.</li>
            <li>Avatar/widget VRM com Noelle/Yoru.</li>
            <li>Room V19 com Build, Yoru POV, Third Person, pulo e câmera livre.</li>
            <li>Emotes VRMA, expressions PNG e inventário GLB.</li>
          </ul>
        </article>

        <article class="v1921-card">
          <h3>Formatos usados</h3>
          <div class="v1921-table">
            <b>VRM</b><span><span class="v1921-kbd">src/assets/Noelle.vrm</span> e <span class="v1921-kbd">src/assets/avatars/*.vrm</span></span>
            <b>VRMA</b><span><span class="v1921-kbd">src/assets/motions/*.vrma</span></span>
            <b>PNG</b><span><span class="v1921-kbd">src/assets/expressions/*.png</span></span>
            <b>GLB</b><span><span class="v1921-kbd">src/assets/items/*.glb</span></span>
            <b>JSON</b><span>manifests, layouts, configs e memórias do projeto.</span>
          </div>
        </article>

        <article class="v1921-card">
          <h3>Links úteis</h3>
          <div class="v1921-links" id="v1921-about-links"></div>
        </article>

        <article class="v1921-card">
          <h3>Regras de assets</h3>
          <ul>
            <li>Usar assets com licença clara.</li>
            <li>Preferir CC0, MIT, permissiva ou asset comprado/licenciado.</li>
            <li>Manter créditos quando a licença pedir.</li>
            <li>Otimizar GLB/VRM antes de importar.</li>
            <li>Evitar modelos gigantes sem necessidade.</li>
          </ul>
        </article>

        <article class="v1921-card">
          <h3>Tecnologias</h3>
          <p>Electron, Node.js, Three.js, @pixiv/three-vrm, Ollama, Piper TTS e faster-whisper STT.</p>
          <div class="v1921-actions">
            <button class="v1921-btn primary" data-action="copy">Copiar diagnóstico</button>
            <button class="v1921-btn" data-action="github">Abrir GitHub</button>
            <button class="v1921-btn" data-action="room">Abrir Room V19</button>
          </div>
        </article>

        <article class="v1921-card">
          <h3>Status esperado</h3>
          <div class="v1921-table">
            <b>Chat IA</b><span>Ollama online/offline com diagnóstico rápido.</span>
            <b>Avatar</b><span>Noelle/Yoru encontrado e widget abrindo.</span>
            <b>Room</b><span>Bundle carregado e botão único Room V19.</span>
            <b>Emotes</b><span>Motions VRMA encontradas.</span>
            <b>Items</b><span>GLBs encontrados e manifest carregado.</span>
            <b>Áudio</b><span>Piper/SAPI e STT com fallback.</span>
          </div>
        </article>
      </div>
    `;

    host.appendChild(root);

    const links = root.querySelector("#v1921-about-links");
    if (links) {
      for (const [label, url] of ABOUT_LINKS) {
        const btn = document.createElement("button");
        btn.className = "v1921-btn";
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", () => openExternal(url));
        links.appendChild(btn);
      }
    }

    root.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (action === "copy") copyText(createDiagnostics());
      if (action === "github") openExternal("https://github.com/MasoriTech/noelle_ia");
      if (action === "room") (window.noelleRoomV19 || window.noelleRoom)?.open?.();
    });
  }

  function tick() {
    injectStyle();
    cleanupRoomButtons();

    if (isSettingsPage()) ensureSettingsPanel();
    else if (isAboutPage()) ensureAboutPanel();
    else removeWrongPanel("none");
  }

  function start() {
    injectStyle();
    applySettings();
    tick();

    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(tick, 80);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    setInterval(tick, 1500);
    console.log("[Noelle V19.2.1] ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();