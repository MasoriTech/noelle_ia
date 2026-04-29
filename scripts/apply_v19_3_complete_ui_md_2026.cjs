"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(
  ROOT,
  "backups",
  "v19_3_complete_ui_md_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)
);

const RUNTIME = "(() => {\n  \"use strict\";\n\n  const PATCH_ID = \"NOELLE_V19_3_COMPLETE_UI_MD_2026\";\n  const STYLE_ID = \"noelle-v19-3-complete-style\";\n  const RUNTIME_ID = \"noelle-v19-3-runtime\";\n  const ROOM_BUTTON_ID = \"noelle-room-v19-canonical-button\";\n  const SETTINGS_KEY = \"noelle.v19.settings\";\n  const PANEL_ATTR = \"data-noelle-v19-3-panel\";\n\n  const SETTINGS = [\n    {\n      title: \"Interface\",\n      items: [\n        [\"theme\", \"Tema\", \"select\", [\"Escuro\", \"Noelle\", \"Alto contraste\"], \"Escuro\"],\n        [\"density\", \"Densidade da interface\", \"select\", [\"Confort\u00e1vel\", \"Compacta\"], \"Confort\u00e1vel\"],\n        [\"fontSize\", \"Tamanho da fonte\", \"select\", [\"Pequena\", \"M\u00e9dia\", \"Grande\"], \"M\u00e9dia\"],\n        [\"showRoomButton\", \"Mostrar bot\u00e3o Room V19\", \"toggle\", null, true],\n        [\"roomButtonPosition\", \"Posi\u00e7\u00e3o do bot\u00e3o Room V19\", \"select\", [\"Inferior direito\", \"Topbar\", \"Sidebar\"], \"Inferior direito\"],\n        [\"rememberLastTab\", \"Lembrar \u00faltima aba aberta\", \"toggle\", null, true],\n        [\"openRoomAtStart\", \"Abrir Room junto com app\", \"toggle\", null, false],\n        [\"openAvatarAtStart\", \"Abrir avatar/widget junto com app\", \"toggle\", null, false],\n        [\"initialRoomMode\", \"Modo inicial da Room\", \"select\", [\"Build\", \"Yoru POV\", \"Third Person\"], \"Build\"],\n        [\"safeUiMode\", \"Modo anti-sobreposi\u00e7\u00e3o de UI\", \"toggle\", null, true]\n      ]\n    },\n    {\n      title: \"Avatar e Room\",\n      items: [\n        [\"mainAvatar\", \"Avatar principal\", \"select\", [\"Noelle.vrm\", \"Yoru.vrm\", \"Detectar automaticamente\"], \"Noelle.vrm\"],\n        [\"roomAvatar\", \"Avatar player da Room\", \"select\", [\"Yoru\", \"Noelle\", \"Fallback\"], \"Yoru\"],\n        [\"povEyeHeight\", \"Altura da c\u00e2mera Yoru POV\", \"select\", [\"Baixa\", \"Normal\", \"Alta\"], \"Normal\"],\n        [\"thirdPersonDistance\", \"Dist\u00e2ncia Third Person\", \"select\", [\"Perto\", \"M\u00e9dio\", \"Longe\"], \"M\u00e9dio\"],\n        [\"showBodyInPov\", \"Mostrar corpo no Yoru POV\", \"toggle\", null, false],\n        [\"yoruSpeed\", \"Velocidade da Yoru\", \"select\", [\"Lenta\", \"Normal\", \"R\u00e1pida\"], \"Normal\"],\n        [\"jumpPower\", \"For\u00e7a do pulo\", \"select\", [\"Baixa\", \"Normal\", \"Alta\"], \"Normal\"],\n        [\"playerCollision\", \"Colis\u00e3o do player\", \"toggle\", null, true],\n        [\"roomAutosave\", \"Autosave da Room\", \"toggle\", null, true],\n        [\"assetSafeMode\", \"Modo seguro de assets\", \"toggle\", null, true]\n      ]\n    },\n    {\n      title: \"Chat IA, \u00e1udio e manuten\u00e7\u00e3o\",\n      items: [\n        [\"defaultModel\", \"Modelo padr\u00e3o\", \"select\", [\"qwen3:0.6b\", \"qwen3:1.7b\", \"Detectar pelo Ollama\"], \"qwen3:0.6b\"],\n        [\"responseProfile\", \"Perfil de resposta\", \"select\", [\"R\u00e1pido\", \"Equilibrado\", \"Detalhado\"], \"R\u00e1pido\"],\n        [\"persona\", \"Persona\", \"select\", [\"S\u00e9ria\", \"Amig\u00e1vel\", \"T\u00e9cnica\", \"Noelle\"], \"S\u00e9ria\"],\n        [\"checkOllamaStart\", \"Verificar Ollama ao iniciar\", \"toggle\", null, true],\n        [\"startOllamaAuto\", \"Iniciar Ollama automaticamente\", \"toggle\", null, true],\n        [\"ttsDefault\", \"TTS padr\u00e3o\", \"select\", [\"Piper\", \"Windows SAPI\", \"Desligado\"], \"Piper\"],\n        [\"sttDefault\", \"STT padr\u00e3o\", \"select\", [\"faster-whisper\", \"Desligado\"], \"faster-whisper\"],\n        [\"reloadManifests\", \"Recarregar manifests ao iniciar\", \"toggle\", null, true],\n        [\"copyDiagnosticsOnError\", \"Copiar diagn\u00f3stico nas falhas\", \"toggle\", null, true],\n        [\"oneBatOnly\", \"Manter apenas INICIAR.bat na raiz\", \"toggle\", null, true]\n      ]\n    }\n  ];\n\n  const ABOUT_LINKS = [\n    [\"GitHub do projeto\", \"https://github.com/MasoriTech/noelle_ia\"],\n    [\"VRoid Studio \u2014 criar avatar VRM\", \"https://vroid.com/en/studio\"],\n    [\"Fab / Sketchfab \u2014 modelos 3D\", \"https://www.fab.com/\"],\n    [\"Poly Haven \u2014 HDRI, texturas e modelos CC0\", \"https://polyhaven.com/\"],\n    [\"OpenGameArt \u2014 assets livres\", \"https://opengameart.org/\"],\n    [\"Mixamo \u2014 anima\u00e7\u00f5es de corpo\", \"https://www.mixamo.com/\"],\n    [\"VRM Consortium \u2014 formato VRM\", \"https://vrm-consortium.org/en/\"]\n  ];\n\n  function defaultSettings() {\n    const out = {};\n    for (const group of SETTINGS) for (const [key, , , , fallback] of group.items) out[key] = fallback;\n    return out;\n  }\n\n  function loadSettings() {\n    try {\n      return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || \"{}\")) };\n    } catch {\n      return defaultSettings();\n    }\n  }\n\n  function saveSettings(settings) {\n    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings, null, 2));\n    applySettings(settings);\n  }\n\n  function injectStyle() {\n    if (document.getElementById(STYLE_ID)) return;\n    const style = document.createElement(\"style\");\n    style.id = STYLE_ID;\n    style.textContent = `\n      html, body { color-scheme: dark; }\n      :root {\n        --n19-card: rgba(14, 14, 25, .96);\n        --n19-card2: rgba(34, 25, 43, .92);\n        --n19-line: rgba(255, 83, 136, .26);\n        --n19-text: #fff4fb;\n        --n19-muted: #c7b8cf;\n        --n19-accent: #ff477e;\n        --n19-accent2: #8b5cf6;\n        --n19-ok: #42f5ad;\n      }\n\n      select, select option, select optgroup {\n        color-scheme: dark !important;\n        background-color: #211f2d !important;\n        color: #fff4fb !important;\n      }\n      select {\n        border-color: rgba(255,255,255,.18) !important;\n      }\n      select option:checked, select option:hover, select option:focus {\n        background-color: #3a2545 !important;\n        color: #ffffff !important;\n      }\n      select:focus, select:focus-visible {\n        outline: 2px solid rgba(255,71,126,.55) !important;\n        outline-offset: 2px !important;\n        box-shadow: 0 0 0 4px rgba(255,71,126,.12) !important;\n      }\n\n      body.noelle-v19-compact .n19-grid { gap: 10px; }\n      body.noelle-v19-compact .n19-card { padding: 12px; }\n      body.noelle-v19-font-small { font-size: 92%; }\n      body.noelle-v19-font-large { font-size: 108%; }\n      body.noelle-v19-theme-noelle {\n        background: radial-gradient(circle at 20% 0%, rgba(255,71,126,.18), transparent 30%), #090711 !important;\n      }\n      body.noelle-v19-theme-contrast { filter: contrast(1.08); }\n\n      .n19-root {\n        width: min(100%, 1180px);\n        margin: 18px 0;\n      }\n      .n19-grid {\n        display: grid;\n        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n        gap: 14px;\n        align-items: start;\n      }\n      .n19-card {\n        border: 1px solid var(--n19-line);\n        background: var(--n19-card);\n        border-radius: 20px;\n        padding: 16px;\n        box-shadow: 0 16px 42px rgba(0,0,0,.20);\n      }\n      .n19-card h3 {\n        margin: 0 0 10px;\n        color: var(--n19-text);\n        font-size: 18px;\n      }\n      .n19-card p, .n19-card li, .n19-card span {\n        color: var(--n19-muted);\n        line-height: 1.45;\n      }\n      .n19-setting {\n        display: grid;\n        grid-template-columns: 1fr minmax(118px, 190px);\n        align-items: center;\n        gap: 10px;\n        border-top: 1px solid rgba(255,255,255,.07);\n        padding: 8px 0;\n      }\n      .n19-setting:first-of-type { border-top: none; }\n      .n19-setting label {\n        color: var(--n19-muted);\n        font-weight: 700;\n      }\n      .n19-setting select {\n        width: 100%;\n        color: var(--n19-text) !important;\n        background: #211f2d !important;\n        border: 1px solid rgba(255,255,255,.14);\n        border-radius: 12px;\n        padding: 9px 10px;\n        outline: none;\n      }\n      .n19-setting input[type=\"checkbox\"] {\n        justify-self: end;\n        width: 22px;\n        height: 22px;\n      }\n      .n19-actions, .n19-links {\n        display: flex;\n        gap: 9px;\n        flex-wrap: wrap;\n        margin-top: 12px;\n      }\n      .n19-links { display: grid; }\n      .n19-btn {\n        border: 1px solid rgba(255,255,255,.14);\n        color: var(--n19-text);\n        background: rgba(255,255,255,.08);\n        border-radius: 13px;\n        padding: 9px 12px;\n        font-weight: 850;\n        cursor: pointer;\n      }\n      .n19-btn.primary {\n        background: linear-gradient(135deg, var(--n19-accent), var(--n19-accent2));\n      }\n      .n19-kbd {\n        display: inline-block;\n        border-radius: 8px;\n        background: rgba(255,255,255,.09);\n        color: var(--n19-text);\n        padding: 2px 7px;\n        font-family: ui-monospace, Consolas, monospace;\n      }\n      .n19-table {\n        display: grid;\n        grid-template-columns: minmax(115px, 170px) 1fr;\n        gap: 7px 12px;\n      }\n      .n19-table b { color: var(--n19-text); }\n\n      #${ROOM_BUTTON_ID} {\n        position: fixed;\n        right: 18px;\n        bottom: 18px;\n        z-index: 2147483500;\n        border: 1px solid rgba(255,83,136,.55);\n        border-radius: 999px;\n        padding: 11px 17px;\n        color: #fff;\n        font-weight: 950;\n        background: linear-gradient(135deg,#ff477e,#8b5cf6);\n        box-shadow: 0 15px 44px rgba(0,0,0,.38);\n        cursor: pointer;\n      }\n      #${ROOM_BUTTON_ID}.topbar { top: 15px; bottom: auto; }\n      #${ROOM_BUTTON_ID}.sidebar { left: 22px; right: auto; bottom: 22px; }\n      #${ROOM_BUTTON_ID}.hidden { display: none !important; }\n\n      .n19-toast {\n        position: fixed;\n        top: 17px;\n        left: 50%;\n        transform: translateX(-50%);\n        z-index: 2147483600;\n        opacity: 0;\n        pointer-events: none;\n        transition: opacity .18s ease;\n        border: 1px solid var(--n19-line);\n        border-radius: 999px;\n        background: rgba(14,14,25,.96);\n        color: var(--n19-text);\n        padding: 10px 14px;\n        box-shadow: 0 16px 44px rgba(0,0,0,.28);\n      }\n      .n19-toast.show { opacity: 1; }\n    `;\n    document.head.appendChild(style);\n  }\n\n  function patchSelects() {\n    for (const select of document.querySelectorAll(\"select\")) {\n      select.style.colorScheme = \"dark\";\n      select.style.backgroundColor = \"#211f2d\";\n      select.style.color = \"#fff4fb\";\n      for (const option of select.querySelectorAll(\"option, optgroup\")) {\n        option.style.backgroundColor = \"#211f2d\";\n        option.style.color = \"#fff4fb\";\n      }\n    }\n  }\n\n  function toast(message) {\n    let el = document.querySelector(\".n19-toast\");\n    if (!el) {\n      el = document.createElement(\"div\");\n      el.className = \"n19-toast\";\n      document.body.appendChild(el);\n    }\n    el.textContent = message;\n    el.classList.add(\"show\");\n    clearTimeout(toast._timer);\n    toast._timer = setTimeout(() => el.classList.remove(\"show\"), 1700);\n  }\n\n  function applySettings(settings = loadSettings()) {\n    document.body.classList.toggle(\"noelle-v19-compact\", settings.density === \"Compacta\");\n    document.body.classList.toggle(\"noelle-v19-font-small\", settings.fontSize === \"Pequena\");\n    document.body.classList.toggle(\"noelle-v19-font-large\", settings.fontSize === \"Grande\");\n    document.body.classList.toggle(\"noelle-v19-theme-noelle\", settings.theme === \"Noelle\");\n    document.body.classList.toggle(\"noelle-v19-theme-contrast\", settings.theme === \"Alto contraste\");\n\n    const btn = document.getElementById(ROOM_BUTTON_ID);\n    if (btn) {\n      btn.classList.toggle(\"hidden\", settings.showRoomButton === false);\n      btn.classList.toggle(\"topbar\", settings.roomButtonPosition === \"Topbar\");\n      btn.classList.toggle(\"sidebar\", settings.roomButtonPosition === \"Sidebar\");\n    }\n  }\n\n  function looksLikeFloatingRoomButton(el) {\n    if (!el || el.id === ROOM_BUTTON_ID) return false;\n    const text = String(el.textContent || \"\").replace(/\\s+/g, \" \").trim();\n    const id = String(el.id || \"\");\n    const cls = String(el.className || \"\");\n    const style = window.getComputedStyle(el);\n    const isFloating = style.position === \"fixed\" || style.position === \"absolute\" || /floating|launcher|room-v19|room/i.test(id + \" \" + cls);\n    const isRoomText = /^\ud83c\udfe0?\\s*Room(\\s*V19)?$/i.test(text) || /^Room(\\s*V19)?$/i.test(text);\n    return isRoomText && isFloating;\n  }\n\n  function cleanupRoomButtons() {\n    for (const el of Array.from(document.querySelectorAll(\"button, a, [role='button'], div\"))) {\n      if (looksLikeFloatingRoomButton(el)) el.remove();\n    }\n\n    let btn = document.getElementById(ROOM_BUTTON_ID);\n    if (!btn) {\n      btn = document.createElement(\"button\");\n      btn.id = ROOM_BUTTON_ID;\n      btn.type = \"button\";\n      btn.textContent = \"\ud83c\udfe0 Room V19\";\n      btn.title = \"Abrir Noelle Room V19\";\n      btn.addEventListener(\"click\", async () => {\n        try {\n          const api = window.noelleRoomV19 || window.noelleRoom;\n          if (api?.open) await api.open();\n          else toast(\"API Room V19 n\u00e3o encontrada\");\n        } catch (err) {\n          console.error(\"[Noelle V19.3] Falha ao abrir Room\", err);\n          toast(\"Falha ao abrir Room\");\n        }\n      });\n      document.body.appendChild(btn);\n    }\n    applySettings();\n  }\n\n  function allText() {\n    return String(document.body?.innerText || \"\");\n  }\n\n  function isSettingsPage() {\n    const text = allText();\n    return /\\bConfigura\u00e7\u00f5es\\b/i.test(text) && /Tema e interface/i.test(text);\n  }\n\n  function isAboutPage() {\n    const text = allText();\n    return /\\bSobre\\b/i.test(text) && /Noelle Companion/i.test(text) && /Avatar:/i.test(text);\n  }\n\n  function findHost() {\n    const headers = Array.from(document.querySelectorAll(\"h1, h2, h3\"));\n    const pageHeader = headers.find((h) => /^(Configura\u00e7\u00f5es|Sobre)$/i.test(String(h.textContent || \"\").trim()));\n    if (pageHeader) {\n      const candidates = [\n        pageHeader.closest(\"main\"),\n        pageHeader.closest(\"section\"),\n        pageHeader.parentElement?.parentElement,\n        pageHeader.parentElement\n      ].filter(Boolean);\n      for (const candidate of candidates) if (candidate && candidate !== document.body && candidate.querySelector) return candidate;\n    }\n\n    const likely = Array.from(document.querySelectorAll(\"main, [class*='content'], [class*='page'], section\"))\n      .filter((el) => el.offsetWidth > 450 && el.offsetHeight > 250)\n      .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];\n\n    return likely || document.body;\n  }\n\n  function removeOldPanels(keepType) {\n    const selectors = [\n      \"[data-noelle-v19-2-1-panel]\",\n      \"[data-noelle-v19-3-panel]\",\n      \"#noelle-v19-2-settings-panel\",\n      \"#noelle-v19-2-about-panel\"\n    ];\n    for (const el of Array.from(document.querySelectorAll(selectors.join(\",\")))) {\n      if (el.getAttribute(PANEL_ATTR) !== keepType) el.remove();\n    }\n  }\n\n  function diagnostics() {\n    return JSON.stringify({\n      patch: PATCH_ID,\n      time: new Date().toISOString(),\n      roomApi: !!(window.noelleRoomV19 || window.noelleRoom),\n      settings: loadSettings(),\n      location: location.href\n    }, null, 2);\n  }\n\n  function copyText(text) {\n    try {\n      navigator.clipboard?.writeText(text);\n      toast(\"Copiado\");\n    } catch {\n      const area = document.createElement(\"textarea\");\n      area.value = text;\n      document.body.appendChild(area);\n      area.select();\n      document.execCommand(\"copy\");\n      area.remove();\n      toast(\"Copiado\");\n    }\n  }\n\n  function openExternal(url) {\n    try {\n      if (window.noelleAPI?.openExternal) return window.noelleAPI.openExternal(url);\n      if (window.desktopWidget?.openExternal) return window.desktopWidget.openExternal(url);\n      window.open(url, \"_blank\", \"noopener,noreferrer\");\n    } catch (err) {\n      console.warn(\"[Noelle V19.3] Falha ao abrir link\", err);\n    }\n  }\n\n  function ensureSettingsPanel() {\n    removeOldPanels(\"settings\");\n    if (document.querySelector(`[${PANEL_ATTR}=\"settings\"]`)) return;\n\n    const host = findHost();\n    const settings = loadSettings();\n    const root = document.createElement(\"section\");\n    root.className = \"n19-root\";\n    root.setAttribute(PANEL_ATTR, \"settings\");\n\n    const intro = document.createElement(\"article\");\n    intro.className = \"n19-card\";\n    intro.innerHTML = `\n      <h3>Configura\u00e7\u00f5es avan\u00e7adas V19.3</h3>\n      <p>Pacote consolidado: interface, Room, Yoru, Chat IA, \u00e1udio, manuten\u00e7\u00e3o, dropdown escuro e bot\u00e3o Room \u00fanico.</p>\n      <div class=\"n19-actions\">\n        <button class=\"n19-btn primary\" data-action=\"save\">Salvar</button>\n        <button class=\"n19-btn\" data-action=\"reset\">Resetar V19</button>\n        <button class=\"n19-btn\" data-action=\"copy\">Copiar diagn\u00f3stico</button>\n        <button class=\"n19-btn\" data-action=\"room\">Abrir Room V19</button>\n      </div>\n    `;\n    root.appendChild(intro);\n\n    const grid = document.createElement(\"div\");\n    grid.className = \"n19-grid\";\n\n    for (const group of SETTINGS) {\n      const card = document.createElement(\"article\");\n      card.className = \"n19-card\";\n      card.innerHTML = `<h3>${group.title}</h3>`;\n\n      for (const [key, label, type, choices, fallback] of group.items) {\n        const row = document.createElement(\"div\");\n        row.className = \"n19-setting\";\n        if (type === \"toggle\") {\n          row.innerHTML = `<label for=\"n19-${key}\">${label}</label><input id=\"n19-${key}\" data-key=\"${key}\" type=\"checkbox\" ${settings[key] === false ? \"\" : \"checked\"} />`;\n        } else {\n          const options = choices.map((choice) => `<option value=\"${choice}\" ${String(settings[key] ?? fallback) === choice ? \"selected\" : \"\"}>${choice}</option>`).join(\"\");\n          row.innerHTML = `<label for=\"n19-${key}\">${label}</label><select id=\"n19-${key}\" data-key=\"${key}\">${options}</select>`;\n        }\n        card.appendChild(row);\n      }\n      grid.appendChild(card);\n    }\n\n    root.appendChild(grid);\n\n    root.addEventListener(\"change\", (event) => {\n      const key = event.target?.dataset?.key;\n      if (!key) return;\n      const next = loadSettings();\n      next[key] = event.target.type === \"checkbox\" ? !!event.target.checked : event.target.value;\n      saveSettings(next);\n      patchSelects();\n    });\n\n    root.addEventListener(\"click\", async (event) => {\n      const action = event.target?.dataset?.action;\n      if (!action) return;\n      if (action === \"save\") {\n        saveSettings(loadSettings());\n        toast(\"Configura\u00e7\u00f5es salvas\");\n      }\n      if (action === \"reset\") {\n        localStorage.removeItem(SETTINGS_KEY);\n        root.remove();\n        ensureSettingsPanel();\n        toast(\"Configura\u00e7\u00f5es V19 resetadas\");\n      }\n      if (action === \"copy\") copyText(diagnostics());\n      if (action === \"room\") {\n        try { await (window.noelleRoomV19 || window.noelleRoom)?.open?.(); }\n        catch { toast(\"Falha ao abrir Room\"); }\n      }\n    });\n\n    host.appendChild(root);\n    patchSelects();\n  }\n\n  function ensureAboutPanel() {\n    removeOldPanels(\"about\");\n    if (document.querySelector(`[${PANEL_ATTR}=\"about\"]`)) return;\n\n    const host = findHost();\n    const root = document.createElement(\"section\");\n    root.className = \"n19-root\";\n    root.setAttribute(PANEL_ATTR, \"about\");\n\n    root.innerHTML = `\n      <div class=\"n19-grid\">\n        <article class=\"n19-card\">\n          <h3>Noelle Companion 2026</h3>\n          <p>Companion local feito com Electron, Three.js, VRM, Ollama, STT/TTS e Room 3D.</p>\n          <ul>\n            <li>Chat IA local com Ollama.</li>\n            <li>Avatar/widget VRM com Noelle/Yoru.</li>\n            <li>Room V19 com Build, Yoru POV, Third Person, pulo e c\u00e2mera livre.</li>\n            <li>Emotes VRMA, expressions PNG e invent\u00e1rio GLB.</li>\n          </ul>\n        </article>\n\n        <article class=\"n19-card\">\n          <h3>Formatos usados</h3>\n          <div class=\"n19-table\">\n            <b>VRM</b><span><span class=\"n19-kbd\">src/assets/Noelle.vrm</span> e <span class=\"n19-kbd\">src/assets/avatars/*.vrm</span></span>\n            <b>VRMA</b><span><span class=\"n19-kbd\">src/assets/motions/*.vrma</span></span>\n            <b>PNG</b><span><span class=\"n19-kbd\">src/assets/expressions/*.png</span></span>\n            <b>GLB</b><span><span class=\"n19-kbd\">src/assets/items/*.glb</span></span>\n            <b>JSON</b><span>manifests, layouts, configs e mem\u00f3rias do projeto.</span>\n          </div>\n        </article>\n\n        <article class=\"n19-card\">\n          <h3>Links \u00fateis</h3>\n          <div class=\"n19-links\" id=\"n19-about-links\"></div>\n        </article>\n\n        <article class=\"n19-card\">\n          <h3>Regras de assets</h3>\n          <ul>\n            <li>Usar assets com licen\u00e7a clara.</li>\n            <li>Preferir CC0, MIT, permissiva ou asset comprado/licenciado.</li>\n            <li>Manter cr\u00e9ditos quando a licen\u00e7a pedir.</li>\n            <li>Otimizar GLB/VRM antes de importar.</li>\n            <li>Evitar modelos gigantes sem necessidade.</li>\n          </ul>\n        </article>\n\n        <article class=\"n19-card\">\n          <h3>Tecnologias</h3>\n          <p>Electron, Node.js, Three.js, @pixiv/three-vrm, Ollama, Piper TTS e faster-whisper STT.</p>\n          <div class=\"n19-actions\">\n            <button class=\"n19-btn primary\" data-action=\"copy\">Copiar diagn\u00f3stico</button>\n            <button class=\"n19-btn\" data-action=\"github\">Abrir GitHub</button>\n            <button class=\"n19-btn\" data-action=\"room\">Abrir Room V19</button>\n          </div>\n        </article>\n\n        <article class=\"n19-card\">\n          <h3>Status esperado</h3>\n          <div class=\"n19-table\">\n            <b>Chat IA</b><span>Ollama online/offline com diagn\u00f3stico r\u00e1pido.</span>\n            <b>Avatar</b><span>Noelle/Yoru encontrado e widget abrindo.</span>\n            <b>Room</b><span>Bundle carregado e bot\u00e3o \u00fanico Room V19.</span>\n            <b>Emotes</b><span>Motions VRMA encontradas.</span>\n            <b>Items</b><span>GLBs encontrados e manifest carregado.</span>\n            <b>\u00c1udio</b><span>Piper/SAPI e STT com fallback.</span>\n          </div>\n        </article>\n      </div>\n    `;\n\n    host.appendChild(root);\n\n    const links = root.querySelector(\"#n19-about-links\");\n    if (links) {\n      for (const [label, url] of ABOUT_LINKS) {\n        const btn = document.createElement(\"button\");\n        btn.className = \"n19-btn\";\n        btn.type = \"button\";\n        btn.textContent = label;\n        btn.addEventListener(\"click\", () => openExternal(url));\n        links.appendChild(btn);\n      }\n    }\n\n    root.addEventListener(\"click\", (event) => {\n      const action = event.target?.dataset?.action;\n      if (action === \"copy\") copyText(diagnostics());\n      if (action === \"github\") openExternal(\"https://github.com/MasoriTech/noelle_ia\");\n      if (action === \"room\") (window.noelleRoomV19 || window.noelleRoom)?.open?.();\n    });\n  }\n\n  function tick() {\n    injectStyle();\n    patchSelects();\n    cleanupRoomButtons();\n\n    if (isSettingsPage()) ensureSettingsPanel();\n    else if (isAboutPage()) ensureAboutPanel();\n    else removeOldPanels(\"none\");\n  }\n\n  function start() {\n    if (window.__NOELLE_V19_3_STARTED__) return;\n    window.__NOELLE_V19_3_STARTED__ = true;\n    injectStyle();\n    applySettings();\n    tick();\n\n    const observer = new MutationObserver(() => {\n      clearTimeout(start._timer);\n      start._timer = setTimeout(tick, 70);\n    });\n    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });\n\n    setInterval(tick, 1600);\n    console.log(\"[Noelle V19.3] Complete UI/MD pack ativo\");\n  }\n\n  if (document.readyState === \"loading\") document.addEventListener(\"DOMContentLoaded\", start);\n  else start();\n\n  window.__NOELLE_V19_3_COMPLETE_UI_MD__ = PATCH_ID;\n})();";
const PRELOAD_BOOTSTRAP = "\n// NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN\n(() => {\n  try {\n    if (globalThis.__NOELLE_V19_3_COMPLETE_BOOTSTRAPPED__) return;\n    globalThis.__NOELLE_V19_3_COMPLETE_BOOTSTRAPPED__ = true;\n\n    const electronForNoelleV19 = require(\"electron\");\n    const bridgeForNoelleV19 = electronForNoelleV19.contextBridge;\n    const ipcForNoelleV19 = electronForNoelleV19.ipcRenderer;\n\n    if (bridgeForNoelleV19 && ipcForNoelleV19 && !globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__) {\n      globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__ = true;\n      bridgeForNoelleV19.exposeInMainWorld(\"noelleRoomV19\", {\n        open: () => ipcForNoelleV19.invoke(\"room:open\"),\n        listCatalog: () => ipcForNoelleV19.invoke(\"room:catalog\"),\n        loadLayout: () => ipcForNoelleV19.invoke(\"room:load-layout\"),\n        saveLayout: (layout) => ipcForNoelleV19.invoke(\"room:save-layout\", layout)\n      });\n    }\n\n    const injectNoelleV19Complete = () => {\n      try {\n        if (document.getElementById(\"noelle-v19-3-complete-runtime-script\")) return;\n        const script = document.createElement(\"script\");\n        script.id = \"noelle-v19-3-complete-runtime-script\";\n        script.src = \"./renderer/noelle_v19_3_complete_ui_md.js\";\n        script.defer = true;\n        (document.head || document.documentElement).appendChild(script);\n      } catch (err) {\n        try { console.warn(\"[Noelle] Falha ao injetar V19.3\", err); } catch {}\n      }\n    };\n\n    if (document.readyState === \"loading\") document.addEventListener(\"DOMContentLoaded\", injectNoelleV19Complete);\n    else injectNoelleV19Complete();\n  } catch (err) {\n    try { console.warn(\"[Noelle] preload V19.3 indispon\u00edvel\", err); } catch {}\n  }\n})();\n// NOELLE_V19_3_COMPLETE_PRELOAD_END\n";
const MEMORY_SECTION = "\n## V19.3 Complete UI/MD Pack \u2014 2026\n\nPacote consolidado para limpar os hotfixes V19.2, V19.2.1 e V19.2.2.\n\nInclui:\n- Corre\u00e7\u00e3o global dos dropdowns/selects com fundo branco no Windows/Electron.\n- Um \u00fanico bot\u00e3o can\u00f4nico `Room V19`: `#noelle-room-v19-canonical-button`.\n- Remo\u00e7\u00e3o de launchers antigos `Room` e `Room V19` duplicados.\n- Painel real de Configura\u00e7\u00f5es avan\u00e7adas com 30 op\u00e7\u00f5es \u00fateis.\n- Painel real de Sobre com:\n  - descri\u00e7\u00e3o do projeto;\n  - formatos VRM/VRMA/PNG/GLB/JSON;\n  - links \u00fateis de assets;\n  - tecnologias usadas;\n  - regras de licen\u00e7a;\n  - status esperado do projeto.\n- Inje\u00e7\u00e3o via `preload.js` e tamb\u00e9m via `src/controls.html` para ser mais robusto.\n- Chat IA deve ser preservado com altera\u00e7\u00f5es m\u00ednimas.\n\nArquivos principais:\n- `src/renderer/noelle_v19_3_complete_ui_md.js`\n- `scripts/apply_v19_3_complete_ui_md_2026.cjs`\n- `scripts/diagnostico_v19_3_complete_ui_md_2026.cjs`\n\nN\u00e3o inclui:\n- Nova mec\u00e2nica de Room.\n- Corre\u00e7\u00e3o de anima\u00e7\u00f5es VRM.\n- Corre\u00e7\u00e3o completa do player Yoru/Third Person.\n- Mega refactor V20.\n";

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return fs.readFileSync(abs(rel), "utf8"); }
function write(rel, text) { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), text, "utf8"); }
function log(msg) { console.log(msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(abs(rel), dst);
}

function backupAndWrite(rel, text) {
  backup(rel);
  write(rel, text);
  log("[OK] Atualizado: " + rel);
}

function nodeCheck(rel) {
  if (!exists(rel)) return true;
  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
  if (result.status !== 0) {
    fail("node --check falhou: " + rel);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return false;
  }
  log("[OK] node --check " + rel);
  return true;
}

function removeOldScriptTags(html) {
  return html
    .replace(/\n?\s*<script\s+src=["']\.\/renderer\/noelle_v19_2_settings_about_cleanup\.js["']><\/script>\s*/g, "\n")
    .replace(/\n?\s*<script\s+src=["']\.\/renderer\/noelle_v19_2_1_settings_about_room_fix\.js["']><\/script>\s*/g, "\n")
    .replace(/\n?\s*<script\s+src=["']\.\/renderer\/noelle_v19_2_2_select_dropdown_fix\.js["']><\/script>\s*/g, "\n")
    .replace(/\n?\s*<script\s+src=["']\.\/renderer\/noelle_v19_3_complete_ui_md\.js["']><\/script>\s*/g, "\n");
}

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) return warn("src/controls.html não encontrado; preload ainda injeta o runtime.");

  let html = read(rel);
  html = removeOldScriptTags(html);

  // Remove botões estáticos antigos "Room" ou "Room V19".
  html = html.replace(/<button[^>]*>\s*🏠?\s*Room(\s*V19)?\s*<\/button>/gi, "");

  const tag = '<script src="./renderer/noelle_v19_3_complete_ui_md.js"></script>';
  if (html.includes("</body>")) html = html.replace("</body>", `  ${tag}\n</body>`);
  else html += `\n${tag}\n`;

  backupAndWrite(rel, html);
}

function patchRenderer() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) return warn("src/renderer/controls_window_app.js não encontrado.");

  let text = read(rel);

  // Remove funções antigas conhecidas que criavam botão Room duplicado.
  text = text.replace(/\n?\(function ensureNoelleRoomFloatingButton\(\) \{[\s\S]*?\}\)\(\);\s*/g, "\n");
  text = text.replace(/\n?\(function mountNoelleRoomV19Launcher\(\) \{[\s\S]*?\}\)\(\);\s*/g, "\n");
  text = text.replace(/\n?function mountNoelleRoomV19Launcher\(\) \{[\s\S]*?\n\}\s*/g, "\n");
  text = text.replace(/\n?function ensureNoelleRoomFloatingButton\(\) \{[\s\S]*?\n\}\s*/g, "\n");

  backupAndWrite(rel, text);
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) return warn("preload.js não encontrado.");

  let text = read(rel);

  // Remove bootstraps antigos V19.x para evitar múltiplas injeções.
  text = text.replace(/\n?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN[\s\S]*?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_END\n?/g, "\n");
  text = text.replace(/\n?\/\/ NOELLE_V19_2_1_PRELOAD_BOOTSTRAP_BEGIN[\s\S]*?\/\/ NOELLE_V19_2_1_PRELOAD_BOOTSTRAP_END\n?/g, "\n");
  text = text.replace(/\n?\/\/ NOELLE_V19_2_2_SELECT_FIX_PRELOAD_BEGIN[\s\S]*?\/\/ NOELLE_V19_2_2_SELECT_FIX_PRELOAD_END\n?/g, "\n");
  text = text.replace(/\n?\/\/ NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN[\s\S]*?\/\/ NOELLE_V19_3_COMPLETE_PRELOAD_END\n?/g, "\n");

  // Remove bloco inseguro conhecido que podia redeclarar contextBridge/ipcRenderer.
  text = text.replace(/\n?try\s*\{\s*if\s*\(typeof contextBridge === "undefined" \|\| typeof ipcRenderer === "undefined"\)\s*\{[\s\S]*?console\.warn\("noelleRoomV19 preload indisponível", err\);\s*\}\s*\n?/g, "\n");

  text = text.trimEnd() + "\n\n" + PRELOAD_BOOTSTRAP.trim() + "\n";
  backupAndWrite(rel, text);
}

function patchPackage() {
  const rel = "package.json";
  if (!exists(rel)) return warn("package.json não encontrado.");

  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (err) { return warn("package.json inválido: " + err.message); }

  backup(rel);
  pkg.version = "19.3.0-complete-ui-md-2026";
  pkg.scripts = {
    ...(pkg.scripts || {}),
    "apply:v19.3": "node scripts/apply_v19_3_complete_ui_md_2026.cjs --apply",
    "diagnostico:v19.3": "node scripts/diagnostico_v19_3_complete_ui_md_2026.cjs"
  };

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json atualizado.");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) {
    backupAndWrite(rel, "# MEMORIA_GPT_NOELLE\n\n" + MEMORY_SECTION.trim() + "\n");
    return;
  }

  let text = read(rel);
  if (!text.includes("V19.3 Complete UI/MD Pack")) {
    text = text.trimEnd() + "\n\n" + MEMORY_SECTION.trim() + "\n";
    backupAndWrite(rel, text);
  } else {
    log("[OK] MEMORIA_GPT_NOELLE.md já contém V19.3.");
  }
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  backupAndWrite("src/renderer/noelle_v19_3_complete_ui_md.js", RUNTIME);
  patchControlsHtml();
  patchRenderer();
  patchPreload();
  patchPackage();
  patchMemory();

  for (const rel of [
    "preload.js",
    "src/renderer/controls_window_app.js",
    "src/renderer/noelle_v19_3_complete_ui_md.js",
    "scripts/diagnostico_v19_3_complete_ui_md_2026.cjs"
  ]) nodeCheck(rel);

  log("");
  if (process.exitCode) log("[RESULTADO] Aplicou parcialmente, mas há erro acima.");
  else {
    log("[OK] V19.3 Complete UI/MD aplicado.");
    log("[INFO] Reinicie a Noelle para garantir que preload e CSS recarregaram.");
  }
}

if (process.argv.includes("--apply")) apply();
else console.log("Uso: node scripts/apply_v19_3_complete_ui_md_2026.cjs --apply");
