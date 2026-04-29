"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, "backups", "v19_2_settings_about_cleanup_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19));

const FILES = {
  runtime: "(() => {\n  \"use strict\";\n\n  const PATCH_ID = \"NOELLE_V19_2_SETTINGS_ABOUT_CLEANUP\";\n  const ROOM_BUTTON_ID = \"noelle-room-v19-single-launcher\";\n  const STYLE_ID = \"noelle-v19-2-settings-about-style\";\n  const SETTINGS_KEY = \"noelle.v19.settings\";\n  const INJECTED_SETTINGS = \"noelleV192SettingsInjected\";\n  const INJECTED_ABOUT = \"noelleV192AboutInjected\";\n\n  const SETTINGS_GROUPS = [\n    {\n      title: \"Interface\",\n      items: [\n        [\"theme\", \"Tema\", \"select\", [\"Escuro\", \"Noelle\", \"Alto contraste\"], \"Escuro\"],\n        [\"density\", \"Densidade da interface\", \"select\", [\"Confort\u00e1vel\", \"Compacta\"], \"Confort\u00e1vel\"],\n        [\"fontSize\", \"Tamanho da fonte\", \"select\", [\"Pequena\", \"M\u00e9dia\", \"Grande\"], \"M\u00e9dia\"],\n        [\"showRoomButton\", \"Mostrar bot\u00e3o Room V19\", \"toggle\", null, true],\n        [\"roomButtonPosition\", \"Posi\u00e7\u00e3o do bot\u00e3o Room V19\", \"select\", [\"Inferior direito\", \"Topbar\", \"Sidebar\"], \"Inferior direito\"],\n        [\"rememberTab\", \"Lembrar \u00faltima aba aberta\", \"toggle\", null, true],\n        [\"openRoomAtStart\", \"Abrir Room junto com app\", \"toggle\", null, false],\n        [\"openAvatarAtStart\", \"Abrir avatar/widget junto com app\", \"toggle\", null, false],\n        [\"initialRoomMode\", \"Modo inicial da Room\", \"select\", [\"Build\", \"Yoru POV\", \"Third Person\"], \"Build\"],\n        [\"safeLayout\", \"Evitar UI sobreposta/largura lotada\", \"toggle\", null, true]\n      ]\n    },\n    {\n      title: \"Avatar e Room\",\n      items: [\n        [\"mainAvatar\", \"Avatar principal\", \"select\", [\"Noelle.vrm\", \"Yoru.vrm\", \"Detectar automaticamente\"], \"Noelle.vrm\"],\n        [\"roomPlayerAvatar\", \"Avatar player da Room\", \"select\", [\"Yoru\", \"Noelle\", \"Fallback\"], \"Yoru\"],\n        [\"povEyeHeight\", \"Altura da c\u00e2mera Yoru POV\", \"select\", [\"Baixa\", \"Normal\", \"Alta\"], \"Normal\"],\n        [\"thirdDistance\", \"Dist\u00e2ncia Third Person\", \"select\", [\"Perto\", \"M\u00e9dio\", \"Longe\"], \"M\u00e9dio\"],\n        [\"showBodyPov\", \"Mostrar corpo no Yoru POV\", \"toggle\", null, false],\n        [\"yoruSpeed\", \"Velocidade da Yoru\", \"select\", [\"Lenta\", \"Normal\", \"R\u00e1pida\"], \"Normal\"],\n        [\"jumpPower\", \"For\u00e7a do pulo\", \"select\", [\"Baixa\", \"Normal\", \"Alta\"], \"Normal\"],\n        [\"playerCollision\", \"Colis\u00e3o do player\", \"toggle\", null, true],\n        [\"roomAutosave\", \"Autosave da Room\", \"toggle\", null, true],\n        [\"assetSafeMode\", \"Modo seguro de assets\", \"toggle\", null, true]\n      ]\n    },\n    {\n      title: \"Chat IA, \u00e1udio e manuten\u00e7\u00e3o\",\n      items: [\n        [\"defaultModel\", \"Modelo padr\u00e3o\", \"select\", [\"qwen3:0.6b\", \"qwen3:1.7b\", \"Detectar pelo Ollama\"], \"qwen3:0.6b\"],\n        [\"responseProfile\", \"Perfil de resposta\", \"select\", [\"R\u00e1pido\", \"Equilibrado\", \"Detalhado\"], \"R\u00e1pido\"],\n        [\"persona\", \"Persona\", \"select\", [\"S\u00e9ria\", \"Amig\u00e1vel\", \"T\u00e9cnica\", \"Noelle\"], \"S\u00e9ria\"],\n        [\"checkOllamaStart\", \"Verificar Ollama ao iniciar\", \"toggle\", null, true],\n        [\"startOllamaAuto\", \"Iniciar Ollama automaticamente\", \"toggle\", null, true],\n        [\"ttsDefault\", \"TTS padr\u00e3o\", \"select\", [\"Piper\", \"Windows SAPI\", \"Desligado\"], \"Piper\"],\n        [\"sttDefault\", \"STT padr\u00e3o\", \"select\", [\"faster-whisper\", \"Desligado\"], \"faster-whisper\"],\n        [\"reloadManifests\", \"Recarregar manifests ao iniciar\", \"toggle\", null, true],\n        [\"copyDiagnostics\", \"Copiar diagn\u00f3stico nas falhas\", \"toggle\", null, true],\n        [\"oneBatOnly\", \"Manter apenas INICIAR.bat na raiz\", \"toggle\", null, true]\n      ]\n    }\n  ];\n\n  const ABOUT_LINKS = [\n    [\"GitHub do projeto\", \"https://github.com/MasoriTech/noelle_ia\"],\n    [\"VRoid Studio \u2014 criar avatar VRM\", \"https://vroid.com/en/studio\"],\n    [\"Fab / Sketchfab \u2014 modelos 3D\", \"https://www.fab.com/\"],\n    [\"Poly Haven \u2014 HDRI, texturas e modelos CC0\", \"https://polyhaven.com/\"],\n    [\"OpenGameArt \u2014 assets livres\", \"https://opengameart.org/\"],\n    [\"Mixamo \u2014 anima\u00e7\u00f5es de corpo\", \"https://www.mixamo.com/\"],\n    [\"VRM Consortium \u2014 formato VRM\", \"https://vrm-consortium.org/en/\"]\n  ];\n\n  function log(...args) {\n    console.log(\"[Noelle V19.2]\", ...args);\n  }\n\n  function loadSettings() {\n    try {\n      return { ...defaultSettings(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || \"{}\")) };\n    } catch {\n      return defaultSettings();\n    }\n  }\n\n  function defaultSettings() {\n    const out = {};\n    for (const group of SETTINGS_GROUPS) {\n      for (const [key, , , , fallback] of group.items) out[key] = fallback;\n    }\n    return out;\n  }\n\n  function saveSettings(settings) {\n    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings, null, 2));\n    applySettings(settings);\n  }\n\n  function openExternal(url) {\n    try {\n      if (window.noelleAPI?.openExternal) return window.noelleAPI.openExternal(url);\n      if (window.desktopWidget?.openExternal) return window.desktopWidget.openExternal(url);\n      window.open(url, \"_blank\", \"noopener,noreferrer\");\n    } catch (err) {\n      console.warn(\"[Noelle V19.2] Falha ao abrir link:\", err);\n    }\n  }\n\n  function copyText(text) {\n    try {\n      navigator.clipboard?.writeText(text);\n      toast(\"Copiado\");\n    } catch {\n      const area = document.createElement(\"textarea\");\n      area.value = text;\n      document.body.appendChild(area);\n      area.select();\n      document.execCommand(\"copy\");\n      area.remove();\n      toast(\"Copiado\");\n    }\n  }\n\n  function toast(message) {\n    let el = document.getElementById(\"noelle-v19-2-toast\");\n    if (!el) {\n      el = document.createElement(\"div\");\n      el.id = \"noelle-v19-2-toast\";\n      el.className = \"noelle-v19-2-toast\";\n      document.body.appendChild(el);\n    }\n    el.textContent = message;\n    el.classList.add(\"show\");\n    clearTimeout(toast._timer);\n    toast._timer = setTimeout(() => el.classList.remove(\"show\"), 1700);\n  }\n\n  function injectStyles() {\n    if (document.getElementById(STYLE_ID)) return;\n    const style = document.createElement(\"style\");\n    style.id = STYLE_ID;\n    style.textContent = `\n      :root {\n        --v19-card: rgba(15, 15, 26, .94);\n        --v19-card-2: rgba(34, 25, 43, .88);\n        --v19-line: rgba(255, 83, 136, .25);\n        --v19-text: #fff4fb;\n        --v19-muted: #c3b5cb;\n        --v19-accent: #ff477e;\n        --v19-accent-2: #8b5cf6;\n        --v19-ok: #42f5ad;\n      }\n      body.noelle-v19-2-compact .v19-2-grid { gap: 10px; }\n      body.noelle-v19-2-compact .v19-2-card { padding: 12px; border-radius: 16px; }\n      body.noelle-v19-2-font-small { font-size: 92%; }\n      body.noelle-v19-2-font-large { font-size: 110%; }\n      body.noelle-v19-2-theme-noelle {\n        background: radial-gradient(circle at 18% 0%, rgba(255,71,126,.18), transparent 34%), #090711;\n      }\n      body.noelle-v19-2-theme-contrast {\n        filter: contrast(1.08);\n      }\n      .v19-2-root {\n        margin: 18px 0 0;\n        width: min(100%, 1180px);\n      }\n      .v19-2-grid {\n        display: grid;\n        grid-template-columns: repeat(auto-fit, minmax(265px, 1fr));\n        gap: 14px;\n        margin-top: 12px;\n      }\n      .v19-2-card {\n        border: 1px solid var(--v19-line);\n        background: var(--v19-card);\n        border-radius: 20px;\n        padding: 16px;\n        box-shadow: 0 18px 42px rgba(0,0,0,.18);\n      }\n      .v19-2-card h3 {\n        margin: 0 0 12px;\n        color: var(--v19-text);\n        font-size: 18px;\n      }\n      .v19-2-card p, .v19-2-card li, .v19-2-card small {\n        color: var(--v19-muted);\n        line-height: 1.45;\n      }\n      .v19-2-setting {\n        display: grid;\n        grid-template-columns: 1fr minmax(120px, 190px);\n        align-items: center;\n        gap: 10px;\n        padding: 8px 0;\n        border-top: 1px solid rgba(255,255,255,.06);\n      }\n      .v19-2-setting:first-of-type { border-top: 0; }\n      .v19-2-setting label { color: var(--v19-muted); font-weight: 650; }\n      .v19-2-setting select, .v19-2-setting input[type=\"checkbox\"] {\n        justify-self: end;\n      }\n      .v19-2-setting select {\n        width: 100%;\n        border-radius: 12px;\n        border: 1px solid rgba(255,255,255,.12);\n        background: rgba(255,255,255,.06);\n        color: var(--v19-text);\n        padding: 9px 10px;\n        outline: none;\n      }\n      .v19-2-actions {\n        display: flex;\n        gap: 10px;\n        flex-wrap: wrap;\n        margin-top: 12px;\n      }\n      .v19-2-actions button, .v19-2-link-button {\n        border: 1px solid rgba(255,255,255,.13);\n        color: var(--v19-text);\n        background: rgba(255,255,255,.07);\n        border-radius: 13px;\n        padding: 9px 12px;\n        font-weight: 800;\n        cursor: pointer;\n      }\n      .v19-2-actions button.primary, .v19-2-link-button.primary {\n        background: linear-gradient(135deg, var(--v19-accent), var(--v19-accent-2));\n      }\n      .v19-2-kbd {\n        display: inline-block;\n        border-radius: 8px;\n        background: rgba(255,255,255,.08);\n        color: var(--v19-text);\n        padding: 2px 7px;\n        font-family: ui-monospace, Consolas, monospace;\n      }\n      .v19-2-links {\n        display: grid;\n        gap: 8px;\n      }\n      .v19-2-status-table {\n        display: grid;\n        grid-template-columns: minmax(110px, 170px) 1fr;\n        gap: 6px 12px;\n        color: var(--v19-muted);\n      }\n      .v19-2-status-table b { color: var(--v19-text); }\n      #${ROOM_BUTTON_ID} {\n        position: fixed;\n        right: 18px;\n        bottom: 18px;\n        z-index: 2147483600;\n        border: 1px solid rgba(255,83,136,.55);\n        border-radius: 999px;\n        padding: 11px 16px;\n        color: #fff;\n        font-weight: 900;\n        background: linear-gradient(135deg,#ff477e,#8b5cf6);\n        box-shadow: 0 14px 44px rgba(0,0,0,.35);\n        cursor: pointer;\n      }\n      #${ROOM_BUTTON_ID}.topbar { top: 14px; bottom: auto; }\n      #${ROOM_BUTTON_ID}.sidebar { left: 22px; right: auto; bottom: 22px; }\n      #${ROOM_BUTTON_ID}.hidden { display: none !important; }\n      .noelle-v19-2-toast {\n        position: fixed;\n        left: 50%;\n        top: 18px;\n        transform: translateX(-50%);\n        z-index: 2147483640;\n        opacity: 0;\n        pointer-events: none;\n        transition: opacity .18s ease;\n        border: 1px solid var(--v19-line);\n        background: rgba(15,15,26,.94);\n        color: var(--v19-text);\n        border-radius: 999px;\n        padding: 10px 14px;\n        box-shadow: 0 16px 46px rgba(0,0,0,.30);\n      }\n      .noelle-v19-2-toast.show { opacity: 1; }\n    `;\n    document.head.appendChild(style);\n  }\n\n  function applySettings(settings = loadSettings()) {\n    document.body.classList.toggle(\"noelle-v19-2-compact\", settings.density === \"Compacta\");\n    document.body.classList.toggle(\"noelle-v19-2-font-small\", settings.fontSize === \"Pequena\");\n    document.body.classList.toggle(\"noelle-v19-2-font-large\", settings.fontSize === \"Grande\");\n    document.body.classList.toggle(\"noelle-v19-2-theme-noelle\", settings.theme === \"Noelle\");\n    document.body.classList.toggle(\"noelle-v19-2-theme-contrast\", settings.theme === \"Alto contraste\");\n\n    const btn = document.getElementById(ROOM_BUTTON_ID);\n    if (btn) {\n      btn.classList.toggle(\"hidden\", settings.showRoomButton === false);\n      btn.classList.toggle(\"topbar\", settings.roomButtonPosition === \"Topbar\");\n      btn.classList.toggle(\"sidebar\", settings.roomButtonPosition === \"Sidebar\");\n    }\n  }\n\n  function isRoomButtonCandidate(el) {\n    if (!el || el.id === ROOM_BUTTON_ID) return false;\n    const text = String(el.textContent || \"\").trim();\n    const id = String(el.id || \"\");\n    return /Room\\s*V19/i.test(text) || /room-v19-launcher/i.test(id) || /noelle-room-v19/i.test(id);\n  }\n\n  function dedupeRoomButtons() {\n    const candidates = Array.from(document.querySelectorAll(\"button, a, [role='button']\"));\n    for (const el of candidates) {\n      if (isRoomButtonCandidate(el)) el.remove();\n    }\n\n    let btn = document.getElementById(ROOM_BUTTON_ID);\n    if (!btn) {\n      btn = document.createElement(\"button\");\n      btn.id = ROOM_BUTTON_ID;\n      btn.type = \"button\";\n      btn.textContent = \"\ud83c\udfe0 Room V19\";\n      btn.title = \"Abrir Noelle Room V19\";\n      btn.addEventListener(\"click\", async () => {\n        try {\n          const api = window.noelleRoomV19 || window.noelleRoom;\n          if (api?.open) await api.open();\n          else toast(\"API da Room V19 n\u00e3o encontrada\");\n        } catch (err) {\n          console.error(\"[Noelle V19.2] Falha ao abrir Room V19\", err);\n          toast(\"Falha ao abrir Room V19\");\n        }\n      });\n      document.body.appendChild(btn);\n    }\n    applySettings();\n  }\n\n  function getActivePageTitle() {\n    const headings = Array.from(document.querySelectorAll(\"main h1, main h2, section h1, section h2, h1, h2\"));\n    for (const h of headings) {\n      const text = String(h.textContent || \"\").trim();\n      if (/^(Configura\u00e7\u00f5es|Sobre|Chat IA|Avatar|Emotes|Invent\u00e1rio|Principal)$/i.test(text)) return { text, node: h };\n    }\n    return { text: \"\", node: null };\n  }\n\n  function findInjectionRoot(titleNode) {\n    if (!titleNode) return null;\n    const candidates = [\n      titleNode.closest(\"main\"),\n      titleNode.closest(\"[class*='content']\"),\n      titleNode.closest(\"[class*='page']\"),\n      titleNode.parentElement?.parentElement,\n      titleNode.parentElement\n    ].filter(Boolean);\n\n    for (const node of candidates) {\n      if (node && node !== document.body && node.querySelector) return node;\n    }\n    return document.body;\n  }\n\n  function injectSettingsPage(titleNode) {\n    const root = findInjectionRoot(titleNode);\n    if (!root || root.dataset[INJECTED_SETTINGS] === \"1\") return;\n    root.dataset[INJECTED_SETTINGS] = \"1\";\n\n    const settings = loadSettings();\n    const wrap = document.createElement(\"section\");\n    wrap.className = \"v19-2-root\";\n    wrap.id = \"noelle-v19-2-settings-panel\";\n\n    const header = document.createElement(\"div\");\n    header.className = \"v19-2-card\";\n    header.innerHTML = `\n      <h3>Configura\u00e7\u00f5es avan\u00e7adas V19.2</h3>\n      <p>Essas op\u00e7\u00f5es organizam interface, Room, Yoru, Chat IA, \u00e1udio e assets sem mexer no layout do Chat IA que j\u00e1 est\u00e1 bom.</p>\n      <div class=\"v19-2-actions\">\n        <button class=\"primary\" data-action=\"save-settings\">Salvar configura\u00e7\u00f5es</button>\n        <button data-action=\"reset-settings\">Resetar V19.2</button>\n        <button data-action=\"copy-settings\">Copiar diagn\u00f3stico</button>\n        <button data-action=\"open-room\">Abrir Room V19</button>\n      </div>\n    `;\n    wrap.appendChild(header);\n\n    const grid = document.createElement(\"div\");\n    grid.className = \"v19-2-grid\";\n\n    for (const group of SETTINGS_GROUPS) {\n      const card = document.createElement(\"div\");\n      card.className = \"v19-2-card\";\n      card.innerHTML = `<h3>${group.title}</h3>`;\n\n      for (const [key, label, type, choices, fallback] of group.items) {\n        const row = document.createElement(\"div\");\n        row.className = \"v19-2-setting\";\n\n        if (type === \"toggle\") {\n          row.innerHTML = `\n            <label for=\"v19-setting-${key}\">${label}</label>\n            <input id=\"v19-setting-${key}\" data-setting=\"${key}\" type=\"checkbox\" ${settings[key] === false ? \"\" : \"checked\"} />\n          `;\n        } else {\n          const opts = (choices || []).map((choice) => `<option value=\"${choice}\" ${String(settings[key] ?? fallback) === choice ? \"selected\" : \"\"}>${choice}</option>`).join(\"\");\n          row.innerHTML = `\n            <label for=\"v19-setting-${key}\">${label}</label>\n            <select id=\"v19-setting-${key}\" data-setting=\"${key}\">${opts}</select>\n          `;\n        }\n\n        card.appendChild(row);\n      }\n\n      grid.appendChild(card);\n    }\n\n    wrap.appendChild(grid);\n\n    wrap.addEventListener(\"change\", (event) => {\n      const el = event.target;\n      const key = el?.dataset?.setting;\n      if (!key) return;\n      const next = loadSettings();\n      next[key] = el.type === \"checkbox\" ? !!el.checked : el.value;\n      saveSettings(next);\n    });\n\n    wrap.addEventListener(\"click\", async (event) => {\n      const action = event.target?.dataset?.action;\n      if (!action) return;\n\n      if (action === \"save-settings\") {\n        saveSettings(loadSettings());\n        toast(\"Configura\u00e7\u00f5es salvas\");\n      }\n\n      if (action === \"reset-settings\") {\n        localStorage.removeItem(SETTINGS_KEY);\n        toast(\"Configura\u00e7\u00f5es V19.2 resetadas\");\n        root.dataset[INJECTED_SETTINGS] = \"\";\n        wrap.remove();\n        setTimeout(() => injectSettingsPage(titleNode), 50);\n      }\n\n      if (action === \"copy-settings\") {\n        copyText(createDiagnosticsText());\n      }\n\n      if (action === \"open-room\") {\n        try {\n          await (window.noelleRoomV19 || window.noelleRoom)?.open?.();\n        } catch (err) {\n          console.error(err);\n          toast(\"Falha ao abrir Room\");\n        }\n      }\n    });\n\n    root.appendChild(wrap);\n  }\n\n  function createDiagnosticsText() {\n    const settings = loadSettings();\n    const status = {\n      patch: PATCH_ID,\n      href: location.href,\n      roomApi: !!(window.noelleRoomV19 || window.noelleRoom),\n      noelleApi: !!window.noelleAPI,\n      settings,\n      time: new Date().toISOString()\n    };\n    return JSON.stringify(status, null, 2);\n  }\n\n  function injectAboutPage(titleNode) {\n    const root = findInjectionRoot(titleNode);\n    if (!root || root.dataset[INJECTED_ABOUT] === \"1\") return;\n    root.dataset[INJECTED_ABOUT] = \"1\";\n\n    const wrap = document.createElement(\"section\");\n    wrap.className = \"v19-2-root\";\n    wrap.id = \"noelle-v19-2-about-panel\";\n\n    wrap.innerHTML = `\n      <div class=\"v19-2-grid\">\n        <article class=\"v19-2-card\">\n          <h3>Noelle Companion 2026</h3>\n          <p>Companion local feito com Electron, Three.js, VRM, Ollama, STT/TTS e Room 3D.</p>\n          <ul>\n            <li>Chat IA local com Ollama.</li>\n            <li>Avatar/widget VRM com Noelle/Yoru.</li>\n            <li>Emotes VRMA, expressions PNG e items GLB.</li>\n            <li>Room V19 com Build, Yoru POV, Third Person, pulo e c\u00e2mera livre.</li>\n          </ul>\n        </article>\n\n        <article class=\"v19-2-card\">\n          <h3>Arquivos e formatos</h3>\n          <div class=\"v19-2-status-table\">\n            <b>VRM</b><span><span class=\"v19-2-kbd\">src/assets/Noelle.vrm</span> e <span class=\"v19-2-kbd\">src/assets/avatars/*.vrm</span></span>\n            <b>VRMA</b><span><span class=\"v19-2-kbd\">src/assets/motions/*.vrma</span></span>\n            <b>PNG</b><span><span class=\"v19-2-kbd\">src/assets/expressions/*.png</span></span>\n            <b>GLB</b><span><span class=\"v19-2-kbd\">src/assets/items/*.glb</span></span>\n            <b>JSON</b><span>manifests, layouts e configura\u00e7\u00f5es.</span>\n          </div>\n        </article>\n\n        <article class=\"v19-2-card\">\n          <h3>Links \u00fateis</h3>\n          <div class=\"v19-2-links\" id=\"v19-about-links\"></div>\n        </article>\n\n        <article class=\"v19-2-card\">\n          <h3>Regras de assets</h3>\n          <ul>\n            <li>Usar assets com licen\u00e7a clara.</li>\n            <li>Preferir CC0, MIT, permissiva ou asset comprado/licenciado.</li>\n            <li>Guardar cr\u00e9ditos quando a licen\u00e7a pedir.</li>\n            <li>Otimizar GLB/VRM antes de importar.</li>\n            <li>Usar nomes simples: <span class=\"v19-2-kbd\">office_desk.glb</span>, <span class=\"v19-2-kbd\">yoru_idle.vrma</span>.</li>\n          </ul>\n        </article>\n\n        <article class=\"v19-2-card\">\n          <h3>Tecnologias</h3>\n          <p>Electron, Node.js, Three.js, @pixiv/three-vrm, Ollama, Piper TTS e faster-whisper STT.</p>\n          <div class=\"v19-2-actions\">\n            <button class=\"primary\" data-action=\"copy-about-diagnostics\">Copiar diagn\u00f3stico</button>\n            <button data-action=\"open-github\">Abrir GitHub</button>\n            <button data-action=\"open-room\">Abrir Room V19</button>\n          </div>\n        </article>\n\n        <article class=\"v19-2-card\">\n          <h3>Status esperado</h3>\n          <div class=\"v19-2-status-table\">\n            <b>Chat IA</b><span>Ollama online/offline com diagn\u00f3stico r\u00e1pido.</span>\n            <b>Avatar</b><span>Noelle/Yoru encontrados e widget abrindo.</span>\n            <b>Room</b><span>Bundle carregado e bot\u00e3o \u00fanico Room V19.</span>\n            <b>Emotes</b><span>Motions VRMA encontradas.</span>\n            <b>Items</b><span>GLBs encontrados e manifest carregado.</span>\n            <b>\u00c1udio</b><span>Piper/SAPI e STT com fallback.</span>\n          </div>\n        </article>\n      </div>\n    `;\n\n    root.appendChild(wrap);\n\n    const linkBox = wrap.querySelector(\"#v19-about-links\");\n    if (linkBox) {\n      for (const [label, url] of ABOUT_LINKS) {\n        const button = document.createElement(\"button\");\n        button.className = \"v19-2-link-button\";\n        button.textContent = label;\n        button.type = \"button\";\n        button.addEventListener(\"click\", () => openExternal(url));\n        linkBox.appendChild(button);\n      }\n    }\n\n    wrap.addEventListener(\"click\", (event) => {\n      const action = event.target?.dataset?.action;\n      if (action === \"copy-about-diagnostics\") copyText(createDiagnosticsText());\n      if (action === \"open-github\") openExternal(\"https://github.com/MasoriTech/noelle_ia\");\n      if (action === \"open-room\") (window.noelleRoomV19 || window.noelleRoom)?.open?.();\n    });\n  }\n\n  let scheduled = false;\n  function scanAndEnhance() {\n    if (scheduled) return;\n    scheduled = true;\n    requestAnimationFrame(() => {\n      scheduled = false;\n      injectStyles();\n      dedupeRoomButtons();\n\n      const { text, node } = getActivePageTitle();\n      if (/^Configura\u00e7\u00f5es$/i.test(text)) injectSettingsPage(node);\n      if (/^Sobre$/i.test(text)) injectAboutPage(node);\n    });\n  }\n\n  function start() {\n    injectStyles();\n    dedupeRoomButtons();\n    applySettings();\n    scanAndEnhance();\n\n    const observer = new MutationObserver(scanAndEnhance);\n    observer.observe(document.documentElement, { childList: true, subtree: true });\n\n    window.addEventListener(\"storage\", () => applySettings(loadSettings()));\n    log(\"ativo\");\n  }\n\n  if (document.readyState === \"loading\") document.addEventListener(\"DOMContentLoaded\", start);\n  else start();\n})();\n",
  safePreload: "\n// NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN\n(() => {\n  try {\n    const electronForNoelleRoomV19 = require(\"electron\");\n    const bridgeForNoelleRoomV19 = electronForNoelleRoomV19.contextBridge;\n    const ipcForNoelleRoomV19 = electronForNoelleRoomV19.ipcRenderer;\n\n    if (!bridgeForNoelleRoomV19 || !ipcForNoelleRoomV19) return;\n    if (globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__) return;\n\n    globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__ = true;\n\n    bridgeForNoelleRoomV19.exposeInMainWorld(\"noelleRoomV19\", {\n      open: () => ipcForNoelleRoomV19.invoke(\"room:open\"),\n      listCatalog: () => ipcForNoelleRoomV19.invoke(\"room:catalog\"),\n      loadLayout: () => ipcForNoelleRoomV19.invoke(\"room:load-layout\"),\n      saveLayout: (layout) => ipcForNoelleRoomV19.invoke(\"room:save-layout\", layout)\n    });\n  } catch (err) {\n    try {\n      console.warn(\"[Noelle] noelleRoomV19 preload indispon\u00edvel\", err);\n    } catch {}\n  }\n})();\n// NOELLE_ROOM_V19_PRELOAD_SAFE_END\n"
};

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

function runCheck(rel) {
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

function removeV19LauncherDuplicatesFromHtml(html) {
  let next = html;

  // Remove launcher inline antigo do V19 que criava botão duplicado.
  next = next.replace(/<button id="noelle-room-v19-launcher-inline"[\s\S]*?<\/script>/g, "");
  next = next.replace(/<button[^>]+id=["']noelle-room-v19-launcher["'][\s\S]*?<\/button>/g, "");
  next = next.replace(/<button[^>]*>\s*🏠\s*Room V19\s*<\/button>/g, "");

  return next;
}

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) return warn("src/controls.html não encontrado.");

  let html = read(rel);
  html = removeV19LauncherDuplicatesFromHtml(html);

  // Garante script externo único. Ele resolve duplicidade de botão e adiciona Settings/About.
  html = html.replace(/\n?\s*<script\s+src=["']\.\/renderer\/noelle_v19_2_settings_about_cleanup\.js["']><\/script>\s*/g, "\n");

  const tag = '<script src="./renderer/noelle_v19_2_settings_about_cleanup.js"></script>';
  if (html.includes("</body>")) html = html.replace("</body>", `  ${tag}\n</body>`);
  else html += `\n${tag}\n`;

  backupAndWrite(rel, html);
}

function patchControlsRenderer() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) return warn("src/renderer/controls_window_app.js não encontrado.");

  let text = read(rel);

  // Remove blocos antigos que montavam botão Room V19 duplicado via renderer.
  text = text.replace(/\n?\(function mountNoelleRoomV19Launcher\(\) \{[\s\S]*?\}\)\(\);\s*/g, "\n");
  text = text.replace(/\n?function mountNoelleRoomV19Launcher\(\) \{[\s\S]*?\n\}\s*/g, "\n");

  // Remove strings de botão antigo se existirem em trechos soltos.
  text = text.replace(/document\.getElementById\("noelle-room-v19-launcher"\)[\s\S]{0,500}?appendChild\(button\);/g, "");

  backupAndWrite(rel, text);
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) return warn("preload.js não encontrado.");

  let text = read(rel);

  // Remove bloco inseguro antigo que gerava erro de redeclaração.
  text = text.replace(
    /\n?try\s*\{\s*if\s*\(typeof contextBridge === "undefined" \|\| typeof ipcRenderer === "undefined"\)\s*\{[\s\S]*?console\.warn\("noelleRoomV19 preload indisponível", err\);\s*\}\s*\n?/g,
    "\n"
  );

  text = text.replace(/\n?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN[\s\S]*?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_END\n?/g, "\n");
  text = text.trimEnd() + "\n\n" + FILES.safePreload.trim() + "\n";

  backupAndWrite(rel, text);
}

function patchPackage() {
  const rel = "package.json";
  if (!exists(rel)) return warn("package.json não encontrado.");

  let pkg;
  try { pkg = JSON.parse(read(rel)); }
  catch (err) { return warn("package.json inválido: " + err.message); }

  backup(rel);
  pkg.version = "19.2.0-settings-about-cleanup-2026";
  pkg.scripts = {
    ...(pkg.scripts || {}),
    "diagnostico:v19.2": "node scripts/diagnostico_v19_2_settings_about_cleanup_2026.cjs",
    "apply:v19.2": "node scripts/apply_v19_2_settings_about_cleanup_2026.cjs --apply"
  };

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json atualizado.");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return warn("MEMORIA_GPT_NOELLE.md não encontrado.");

  let text = read(rel);
  if (!text.includes("V19.2 Settings/About Cleanup")) {
    text += `

## V19.2 Settings/About Cleanup

- Chat IA foi preservado com alterações mínimas.
- Corrigido botão Room V19 duplicado: existe apenas um launcher canônico.
- Aba Configurações recebe 30 opções úteis organizadas por Interface, Avatar/Room, Chat/Áudio/Manutenção.
- Aba Sobre recebe informações do projeto, links úteis, formatos de assets, regras de licença e status esperado.
- O patch roda por src/renderer/noelle_v19_2_settings_about_cleanup.js e não substitui controls.html inteiro.
- preload.js usa bloco seguro noelleRoomV19 sem redeclarar contextBridge/ipcRenderer.
`;
    backupAndWrite(rel, text);
  }
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  backupAndWrite("src/renderer/noelle_v19_2_settings_about_cleanup.js", FILES.runtime);
  patchControlsHtml();
  patchControlsRenderer();
  patchPreload();
  patchPackage();
  patchMemory();

  for (const rel of [
    "preload.js",
    "src/renderer/controls_window_app.js",
    "src/renderer/noelle_v19_2_settings_about_cleanup.js",
    "scripts/diagnostico_v19_2_settings_about_cleanup_2026.cjs"
  ]) runCheck(rel);

  log("");
  if (process.exitCode) {
    log("[RESULTADO] V19.2 aplicou parcialmente, mas há erro acima.");
  } else {
    log("[OK] V19.2 Settings/About Cleanup aplicada.");
    log("[INFO] Abra Configurações e Sobre para ver os novos painéis.");
  }
}

if (process.argv.includes("--apply")) apply();
else console.log("Uso: node scripts/apply_v19_2_settings_about_cleanup_2026.cjs --apply");
