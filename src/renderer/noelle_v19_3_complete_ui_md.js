(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_3_COMPLETE_UI_MD_2026";
  const STYLE_ID = "noelle-v19-3-complete-style";
  const RUNTIME_ID = "noelle-v19-3-runtime";
  const ROOM_BUTTON_ID = "noelle-room-v19-canonical-button";
  const SETTINGS_KEY = "noelle.v19.settings";
  const PANEL_ATTR = "data-noelle-v19-3-panel";

  const SETTINGS = [
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
    for (const group of SETTINGS) for (const [key, , , , fallback] of group.items) out[key] = fallback;
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
      html, body { color-scheme: dark; }
      :root {
        --n19-card: rgba(14, 14, 25, .96);
        --n19-card2: rgba(34, 25, 43, .92);
        --n19-line: rgba(255, 83, 136, .26);
        --n19-text: #fff4fb;
        --n19-muted: #c7b8cf;
        --n19-accent: #ff477e;
        --n19-accent2: #8b5cf6;
        --n19-ok: #42f5ad;
      }

      select, select option, select optgroup {
        color-scheme: dark !important;
        background-color: #211f2d !important;
        color: #fff4fb !important;
      }
      select {
        border-color: rgba(255,255,255,.18) !important;
      }
      select option:checked, select option:hover, select option:focus {
        background-color: #3a2545 !important;
        color: #ffffff !important;
      }
      select:focus, select:focus-visible {
        outline: 2px solid rgba(255,71,126,.55) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(255,71,126,.12) !important;
      }

      body.noelle-v19-compact .n19-grid { gap: 10px; }
      body.noelle-v19-compact .n19-card { padding: 12px; }
      body.noelle-v19-font-small { font-size: 92%; }
      body.noelle-v19-font-large { font-size: 108%; }
      body.noelle-v19-theme-noelle {
        background: radial-gradient(circle at 20% 0%, rgba(255,71,126,.18), transparent 30%), #090711 !important;
      }
      body.noelle-v19-theme-contrast { filter: contrast(1.08); }

      .n19-root {
        width: min(100%, 1180px);
        margin: 18px 0;
      }
      .n19-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
        align-items: start;
      }
      .n19-card {
        border: 1px solid var(--n19-line);
        background: var(--n19-card);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 16px 42px rgba(0,0,0,.20);
      }
      .n19-card h3 {
        margin: 0 0 10px;
        color: var(--n19-text);
        font-size: 18px;
      }
      .n19-card p, .n19-card li, .n19-card span {
        color: var(--n19-muted);
        line-height: 1.45;
      }
      .n19-setting {
        display: grid;
        grid-template-columns: 1fr minmax(118px, 190px);
        align-items: center;
        gap: 10px;
        border-top: 1px solid rgba(255,255,255,.07);
        padding: 8px 0;
      }
      .n19-setting:first-of-type { border-top: none; }
      .n19-setting label {
        color: var(--n19-muted);
        font-weight: 700;
      }
      .n19-setting select {
        width: 100%;
        color: var(--n19-text) !important;
        background: #211f2d !important;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 12px;
        padding: 9px 10px;
        outline: none;
      }
      .n19-setting input[type="checkbox"] {
        justify-self: end;
        width: 22px;
        height: 22px;
      }
      .n19-actions, .n19-links {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .n19-links { display: grid; }
      .n19-btn {
        border: 1px solid rgba(255,255,255,.14);
        color: var(--n19-text);
        background: rgba(255,255,255,.08);
        border-radius: 13px;
        padding: 9px 12px;
        font-weight: 850;
        cursor: pointer;
      }
      .n19-btn.primary {
        background: linear-gradient(135deg, var(--n19-accent), var(--n19-accent2));
      }
      .n19-kbd {
        display: inline-block;
        border-radius: 8px;
        background: rgba(255,255,255,.09);
        color: var(--n19-text);
        padding: 2px 7px;
        font-family: ui-monospace, Consolas, monospace;
      }
      .n19-table {
        display: grid;
        grid-template-columns: minmax(115px, 170px) 1fr;
        gap: 7px 12px;
      }
      .n19-table b { color: var(--n19-text); }

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

      .n19-toast {
        position: fixed;
        top: 17px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483600;
        opacity: 0;
        pointer-events: none;
        transition: opacity .18s ease;
        border: 1px solid var(--n19-line);
        border-radius: 999px;
        background: rgba(14,14,25,.96);
        color: var(--n19-text);
        padding: 10px 14px;
        box-shadow: 0 16px 44px rgba(0,0,0,.28);
      }
      .n19-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function patchSelects() {
    for (const select of document.querySelectorAll("select")) {
      select.style.colorScheme = "dark";
      select.style.backgroundColor = "#211f2d";
      select.style.color = "#fff4fb";
      for (const option of select.querySelectorAll("option, optgroup")) {
        option.style.backgroundColor = "#211f2d";
        option.style.color = "#fff4fb";
      }
    }
  }

  function toast(message) {
    let el = document.querySelector(".n19-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "n19-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove("show"), 1700);
  }

  function applySettings(settings = loadSettings()) {
    document.body.classList.toggle("noelle-v19-compact", settings.density === "Compacta");
    document.body.classList.toggle("noelle-v19-font-small", settings.fontSize === "Pequena");
    document.body.classList.toggle("noelle-v19-font-large", settings.fontSize === "Grande");
    document.body.classList.toggle("noelle-v19-theme-noelle", settings.theme === "Noelle");
    document.body.classList.toggle("noelle-v19-theme-contrast", settings.theme === "Alto contraste");

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
    for (const el of Array.from(document.querySelectorAll("button, a, [role='button'], div"))) {
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
          console.error("[Noelle V19.3] Falha ao abrir Room", err);
          toast("Falha ao abrir Room");
        }
      });
      document.body.appendChild(btn);
    }
    applySettings();
  }

  function allText() {
    return String(document.body?.innerText || "");
  }

  function isSettingsPage() {
    const text = allText();
    return /\bConfigurações\b/i.test(text) && /Tema e interface/i.test(text);
  }

  function isAboutPage() {
    const text = allText();
    return /\bSobre\b/i.test(text) && /Noelle Companion/i.test(text) && /Avatar:/i.test(text);
  }

  function findHost() {
    const headers = Array.from(document.querySelectorAll("h1, h2, h3"));
    const pageHeader = headers.find((h) => /^(Configurações|Sobre)$/i.test(String(h.textContent || "").trim()));
    if (pageHeader) {
      const candidates = [
        pageHeader.closest("main"),
        pageHeader.closest("section"),
        pageHeader.parentElement?.parentElement,
        pageHeader.parentElement
      ].filter(Boolean);
      for (const candidate of candidates) if (candidate && candidate !== document.body && candidate.querySelector) return candidate;
    }

    const likely = Array.from(document.querySelectorAll("main, [class*='content'], [class*='page'], section"))
      .filter((el) => el.offsetWidth > 450 && el.offsetHeight > 250)
      .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];

    return likely || document.body;
  }

  function removeOldPanels(keepType) {
    const selectors = [
      "[data-noelle-v19-2-1-panel]",
      "[data-noelle-v19-3-panel]",
      "#noelle-v19-2-settings-panel",
      "#noelle-v19-2-about-panel"
    ];
    for (const el of Array.from(document.querySelectorAll(selectors.join(",")))) {
      if (el.getAttribute(PANEL_ATTR) !== keepType) el.remove();
    }
  }

  function diagnostics() {
    return JSON.stringify({
      patch: PATCH_ID,
      time: new Date().toISOString(),
      roomApi: !!(window.noelleRoomV19 || window.noelleRoom),
      settings: loadSettings(),
      location: location.href
    }, null, 2);
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

  function openExternal(url) {
    try {
      if (window.noelleAPI?.openExternal) return window.noelleAPI.openExternal(url);
      if (window.desktopWidget?.openExternal) return window.desktopWidget.openExternal(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("[Noelle V19.3] Falha ao abrir link", err);
    }
  }

  function ensureSettingsPanel() {
    removeOldPanels("settings");
    if (document.querySelector(`[${PANEL_ATTR}="settings"]`)) return;

    const host = findHost();
    const settings = loadSettings();
    const root = document.createElement("section");
    root.className = "n19-root";
    root.setAttribute(PANEL_ATTR, "settings");

    const intro = document.createElement("article");
    intro.className = "n19-card";
    intro.innerHTML = `
      <h3>Configurações avançadas V19.3</h3>
      <p>Pacote consolidado: interface, Room, Yoru, Chat IA, áudio, manutenção, dropdown escuro e botão Room único.</p>
      <div class="n19-actions">
        <button class="n19-btn primary" data-action="save">Salvar</button>
        <button class="n19-btn" data-action="reset">Resetar V19</button>
        <button class="n19-btn" data-action="copy">Copiar diagnóstico</button>
        <button class="n19-btn" data-action="room">Abrir Room V19</button>
      </div>
    `;
    root.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "n19-grid";

    for (const group of SETTINGS) {
      const card = document.createElement("article");
      card.className = "n19-card";
      card.innerHTML = `<h3>${group.title}</h3>`;

      for (const [key, label, type, choices, fallback] of group.items) {
        const row = document.createElement("div");
        row.className = "n19-setting";
        if (type === "toggle") {
          row.innerHTML = `<label for="n19-${key}">${label}</label><input id="n19-${key}" data-key="${key}" type="checkbox" ${settings[key] === false ? "" : "checked"} />`;
        } else {
          const options = choices.map((choice) => `<option value="${choice}" ${String(settings[key] ?? fallback) === choice ? "selected" : ""}>${choice}</option>`).join("");
          row.innerHTML = `<label for="n19-${key}">${label}</label><select id="n19-${key}" data-key="${key}">${options}</select>`;
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
      patchSelects();
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
        root.remove();
        ensureSettingsPanel();
        toast("Configurações V19 resetadas");
      }
      if (action === "copy") copyText(diagnostics());
      if (action === "room") {
        try { await (window.noelleRoomV19 || window.noelleRoom)?.open?.(); }
        catch { toast("Falha ao abrir Room"); }
      }
    });

    host.appendChild(root);
    patchSelects();
  }

  function ensureAboutPanel() {
    removeOldPanels("about");
    if (document.querySelector(`[${PANEL_ATTR}="about"]`)) return;

    const host = findHost();
    const root = document.createElement("section");
    root.className = "n19-root";
    root.setAttribute(PANEL_ATTR, "about");

    root.innerHTML = `
      <div class="n19-grid">
        <article class="n19-card">
          <h3>Noelle Companion 2026</h3>
          <p>Companion local feito com Electron, Three.js, VRM, Ollama, STT/TTS e Room 3D.</p>
          <ul>
            <li>Chat IA local com Ollama.</li>
            <li>Avatar/widget VRM com Noelle/Yoru.</li>
            <li>Room V19 com Build, Yoru POV, Third Person, pulo e câmera livre.</li>
            <li>Emotes VRMA, expressions PNG e inventário GLB.</li>
          </ul>
        </article>

        <article class="n19-card">
          <h3>Formatos usados</h3>
          <div class="n19-table">
            <b>VRM</b><span><span class="n19-kbd">src/assets/Noelle.vrm</span> e <span class="n19-kbd">src/assets/avatars/*.vrm</span></span>
            <b>VRMA</b><span><span class="n19-kbd">src/assets/motions/*.vrma</span></span>
            <b>PNG</b><span><span class="n19-kbd">src/assets/expressions/*.png</span></span>
            <b>GLB</b><span><span class="n19-kbd">src/assets/items/*.glb</span></span>
            <b>JSON</b><span>manifests, layouts, configs e memórias do projeto.</span>
          </div>
        </article>

        <article class="n19-card">
          <h3>Links úteis</h3>
          <div class="n19-links" id="n19-about-links"></div>
        </article>

        <article class="n19-card">
          <h3>Regras de assets</h3>
          <ul>
            <li>Usar assets com licença clara.</li>
            <li>Preferir CC0, MIT, permissiva ou asset comprado/licenciado.</li>
            <li>Manter créditos quando a licença pedir.</li>
            <li>Otimizar GLB/VRM antes de importar.</li>
            <li>Evitar modelos gigantes sem necessidade.</li>
          </ul>
        </article>

        <article class="n19-card">
          <h3>Tecnologias</h3>
          <p>Electron, Node.js, Three.js, @pixiv/three-vrm, Ollama, Piper TTS e faster-whisper STT.</p>
          <div class="n19-actions">
            <button class="n19-btn primary" data-action="copy">Copiar diagnóstico</button>
            <button class="n19-btn" data-action="github">Abrir GitHub</button>
            <button class="n19-btn" data-action="room">Abrir Room V19</button>
          </div>
        </article>

        <article class="n19-card">
          <h3>Status esperado</h3>
          <div class="n19-table">
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

    const links = root.querySelector("#n19-about-links");
    if (links) {
      for (const [label, url] of ABOUT_LINKS) {
        const btn = document.createElement("button");
        btn.className = "n19-btn";
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", () => openExternal(url));
        links.appendChild(btn);
      }
    }

    root.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (action === "copy") copyText(diagnostics());
      if (action === "github") openExternal("https://github.com/MasoriTech/noelle_ia");
      if (action === "room") (window.noelleRoomV19 || window.noelleRoom)?.open?.();
    });
  }

  function tick() {
    injectStyle();
    patchSelects();
    cleanupRoomButtons();

    if (isSettingsPage()) ensureSettingsPanel();
    else if (isAboutPage()) ensureAboutPanel();
    else removeOldPanels("none");
  }

  function start() {
    if (window.__NOELLE_V19_3_STARTED__) return;
    window.__NOELLE_V19_3_STARTED__ = true;
    injectStyle();
    applySettings();
    tick();

    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(tick, 70);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    setInterval(tick, 1600);
    console.log("[Noelle V19.3] Complete UI/MD pack ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__NOELLE_V19_3_COMPLETE_UI_MD__ = PATCH_ID;
})();