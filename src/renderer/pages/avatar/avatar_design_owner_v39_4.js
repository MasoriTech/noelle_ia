(() => {
  "use strict";

  const VERSION = "v39.4";
  const PAGE_SELECTOR = '[data-page="avatar"]';
  const ROOT_ID = "avatarDesignOwnerV394";
  const MAIN_ID = "avatarDesignMainV394";
  const PREVIEW_ID = "avatarPreviewCardV394";
  const SIDE_ID = "avatarSidePanelV394";
  const FRAME_ID = "avatarDesignFrameV394";
  const STATUS_ID = "avatarStatusV394";
  const FALLBACK_ID = "avatarFallbackV394";
  const CSS_ID = "avatarDesignV394Css";
  const PREVIEW_URL = "./avatar_loadfile_preview_v19_8_3.html?owner=v39_4";

  const OLD_NODE_IDS = [
    "avatarDesignOwnerV393",
    "avatarDesignOwnerV392",
    "avatarDesignOwnerV391",
    "avatarDesignOwnerV39",
    "avatarRenderOwnerV38",
    "avatarLoadfileWorkingV1983",
    "avatarLoadfileSimpleV32",
    "avatarPageV31",
    "avatarUnifiedWindow",
    "avatarMount",
    "avatarMountV30",
    "noelleAvatarV1982"
  ];

  const OLD_SCRIPT_PARTS = [
    "noelle_avatar_tab_v19_8_2.js",
    "avatar_legacy_blocker_v27.js",
    "avatar_renderer_restore_v27_1.js",
    "restore_avatar_carousel_runtime_v28.js",
    "avatar_window_unified_v29.js",
    "avatar_page_v30.js",
    "avatar_page_v31.js",
    "avatar_loadfile_page_v32.js",
    "avatar_carousel_mount_v31.js",
    "avatar_assets_bridge_v31_2.js",
    "avatar_loadfile_layout_v33.js",
    "avatar_loadfile_true_size_v34.js",
    "avatar_loadfile_fixed_sizes_v36.js",
    "avatar_outer_size_only_v36_1.js",
    "avatar_restore_loadfile_v19_8_3.js",
    "avatar_render_owner_v38.js",
    "avatar_design_owner_v39.js",
    "avatar_design_owner_v39_1.js",
    "avatar_design_owner_v39_2.js",
    "avatar_design_owner_v39_3.js",
    "avatar_loadfile_size_640"
  ];

  const state = {
    applying: false,
    observerInstalled: false,
    frameLoaded: false,
    fallbackTimer: null,
    debounceTimer: null
  };

  function log(...args) {
    console.log("[avatar-design-v39.4]", ...args);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function page() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function setImportant(el, prop, value) {
    if (el) el.style.setProperty(prop, value, "important");
  }

  function injectCss() {
    if ($(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = "./renderer/pages/avatar/avatar_design_v39_4.css";
    document.head.appendChild(link);
  }

  function disableOldGlobals() {
    try {
      window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = false;
      window.__AVATAR_CAROUSEL_ACTIVE__ = false;
      window.__AVATAR_FILELOAD_RENDERER_ACTIVE__ = false;
      window.__AVATAR_RENDERER_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_V31_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_1_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_2_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_3_ACTIVE__ = false;
      window.__YORU_AVATAR_RENDER_OWNER__ = VERSION;
    } catch {}
  }

  function removeOldScripts() {
    document.querySelectorAll("script[src]").forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (src.includes("avatar_design_owner_v39_4.js")) return;
      if (OLD_SCRIPT_PARTS.some((part) => src.includes(part))) script.remove();
    });
  }

  function removeOldNodes() {
    OLD_NODE_IDS.forEach((id) => {
      const el = $(id);
      if (el) el.remove();
    });

    document.querySelectorAll("#errorBox, .error-box").forEach((el) => {
      const text = el.textContent || "";
      if (/avatar|renderer|bundle|carousel|loadfile/i.test(text)) el.remove();
    });
  }

  function forcePageShell(host) {
    setImportant(host, "display", "block");
    setImportant(host, "width", "100%");
    setImportant(host, "height", "100%");
    setImportant(host, "min-width", "0");
    setImportant(host, "min-height", "0");
    setImportant(host, "max-width", "none");
    setImportant(host, "overflow", "hidden");
    setImportant(host, "padding", "12px 18px 14px");
    setImportant(host, "box-sizing", "border-box");
  }

  function hideNonOwner(host) {
    [...host.children].forEach((child) => {
      if (child.id === ROOT_ID) {
        child.hidden = false;
        setImportant(child, "display", "grid");
        return;
      }
      if (child.tagName === "SCRIPT") return;
      child.hidden = true;
      setImportant(child, "display", "none");
      child.dataset.hiddenByAvatarV394 = "true";
    });
  }

  function button(label, id, primary = false) {
    return `<button id="${id}" type="button" class="avatar-v394-button${primary ? " primary" : ""}">${label}</button>`;
  }

  function infoRow(k, v) {
    return `
      <div style="display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;font-size:13px;line-height:1.35;">
        <span style="color:rgba(255,255,255,.48);">${k}</span>
        <strong style="color:rgba(255,255,255,.86);font-weight:850;overflow:hidden;text-overflow:ellipsis;">${v}</strong>
      </div>`;
  }

  function panel(title, body) {
    return `
      <section class="avatar-v394-panel" data-avatar-panel="${title}">
        <div class="avatar-v394-panel-title">
          <h2>${title}</h2>
          <span style="font-size:18px;color:#d995ff;">⌃</span>
        </div>
        ${body}
      </section>`;
  }

  function buildSidePanel() {
    const info = `
      <div style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;align-items:center;">
        <div style="width:72px;height:72px;border-radius:18px;border:1px solid rgba(255,122,200,.22);background:radial-gradient(circle at 50% 35%,rgba(255,130,210,.30),transparent 62%),rgba(255,255,255,.045);display:grid;place-items:center;font-size:30px;">👑</div>
        <div style="display:grid;gap:5px;min-width:0;">
          ${infoRow("Nome", "Noelle")}
          ${infoRow("Arquivo", "Noelle.vrm")}
          ${infoRow("Tipo", "Humanoide")}
          ${infoRow("Estado", "Carregado")}
        </div>
      </div>`;

    const controls = `
      <div style="display:grid;gap:13px;">
        <label style="display:grid;grid-template-columns:72px minmax(0,1fr) 52px;gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Zoom
          <input id="avatarZoomV394" type="range" min="50" max="160" value="100" style="width:100%;accent-color:#d262ff;">
          <span id="avatarZoomLabelV394" style="text-align:right;">100%</span>
        </label>
        <label style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Pose
          <select style="min-height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.12);color:#fff;background:rgba(255,255,255,.06);padding:0 10px;">
            <option>T-Pose</option><option>Idle</option><option>Preview</option>
          </select>
        </label>
        <div style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Fundo
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" title="Grade" style="width:42px;height:42px;border-radius:12px;border:2px solid #d262ff;background:#171222;color:#bbb;">▦</button>
            <button type="button" title="Escuro" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#120d1a;"></button>
            <button type="button" title="Roxo" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#211329,#55315f);"></button>
          </div>
        </div>
      </div>`;

    const camera = `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${button("Frontal", "avatarCamFrontV394", true)}
        ${button("Esquerda", "avatarCamLeftV394")}
        ${button("Direita", "avatarCamRightV394")}
        ${button("Superior", "avatarCamTopV394")}
        ${button("Enquadrar", "avatarFitV394")}
        ${button("Reset", "avatarResetV394")}
      </div>`;

    const lighting = `
      <label style="display:grid;grid-template-columns:84px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
        Intensidade
        <input type="range" min="0" max="100" value="75" style="width:100%;accent-color:#d262ff;">
        <span>75%</span>
      </label>`;

    const actions = `
      <div style="display:grid;gap:8px;">
        ${button("Recarregar Avatar", "avatarReloadSideV394")}
        ${button("Abrir Widget", "avatarOpenWidgetSideV394", true)}
      </div>`;

    return `
      <aside id="${SIDE_ID}">
        ${panel("Informações do Avatar", info)}
        ${panel("Controles de Visualização", controls)}
        ${panel("Câmera", camera)}
        ${panel("Iluminação", lighting)}
        ${panel("Ações rápidas", actions)}
      </aside>`;
  }

  function buildPreviewCard() {
    return `
      <section id="${PREVIEW_ID}">
        <div class="avatar-v394-preview-bar">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <strong style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Preview do Avatar</strong>
            <span style="border:1px solid rgba(255,122,200,.25);background:rgba(255,255,255,.055);border-radius:999px;padding:5px 10px;color:#f7c1e6;font-weight:850;font-size:12px;flex:0 0 auto;">Noelle</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;">
            <span id="${STATUS_ID}" class="avatar-v394-pill">preview iniciando</span>
            <button id="avatarReloadPreviewV394" type="button" title="Recarregar" class="avatar-v394-button" style="width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;">↻</button>
          </div>
        </div>
        <div class="avatar-v394-frame-shell">
          <iframe id="${FRAME_ID}" title="Avatar Loadfile Preview" src="${PREVIEW_URL}" allow="fullscreen"></iframe>
          <div class="avatar-v394-left-tools">
            <button type="button" class="avatar-v394-tool">⌕</button>
            <button type="button" class="avatar-v394-tool">⛶</button>
            <button type="button" class="avatar-v394-tool">↺</button>
          </div>
          <div id="${FALLBACK_ID}">
            <div><strong style="display:block;font-size:20px;margin-bottom:8px;">Preview não carregou</strong><span>Verifique <code>src/avatar_loadfile_preview_v19_8_3.html</code>.</span></div>
          </div>
        </div>
      </section>`;
  }

  function buildRoot() {
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.avatarOwner = VERSION;
    root.innerHTML = `
      <header class="avatar-v394-header">
        <div style="min-width:0;">
          <h1 class="avatar-v394-title">Avatar</h1>
          <p class="avatar-v394-subtitle">Gerencie e visualize seu avatar 3D em tempo real.</p>
        </div>
        <div class="avatar-v394-top-actions">
          <div style="height:42px;padding:0 16px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.045);display:flex;align-items:center;gap:8px;font-weight:850;color:#fff;">
            <span style="width:9px;height:9px;border-radius:999px;background:#48dd78;box-shadow:0 0 12px rgba(72,221,120,.6);"></span>Status
          </div>
          ${button("Abrir Widget ↗", "avatarOpenWidgetTopV394", true)}
        </div>
      </header>
      <main id="${MAIN_ID}">
        ${buildPreviewCard()}
        ${buildSidePanel()}
      </main>`;
    return root;
  }

  function applyHardLayout() {
    const root = $(ROOT_ID);
    const main = $(MAIN_ID);
    const preview = $(PREVIEW_ID);
    const side = $(SIDE_ID);
    const frame = $(FRAME_ID);
    if (!root || !main || !preview || !side) return false;

    setImportant(root, "display", "grid");
    setImportant(root, "width", "100%");
    setImportant(root, "height", "calc(100vh - 138px)");
    setImportant(root, "min-height", "600px");
    setImportant(root, "grid-template-rows", "64px minmax(0,1fr)");
    setImportant(root, "overflow", "hidden");

    const compact = window.innerWidth < 1180;
    const medium = window.innerWidth < 1360;
    setImportant(main, "display", "grid");
    setImportant(main, "gap", "16px");
    setImportant(main, "min-width", "0");
    setImportant(main, "min-height", "0");

    if (compact) {
      setImportant(main, "grid-template-columns", "1fr");
      setImportant(main, "grid-template-areas", '"preview" "side"');
      setImportant(main, "overflow", "auto");
      setImportant(side, "max-height", "520px");
    } else if (medium) {
      setImportant(main, "grid-template-columns", "minmax(560px,1fr) 340px");
      setImportant(main, "grid-template-areas", '"preview side"');
      setImportant(main, "overflow", "hidden");
      setImportant(side, "max-height", "none");
    } else {
      setImportant(main, "grid-template-columns", "minmax(620px,1fr) 390px");
      setImportant(main, "grid-template-areas", '"preview side"');
      setImportant(main, "overflow", "hidden");
      setImportant(side, "max-height", "none");
    }

    setImportant(preview, "grid-area", "preview");
    setImportant(preview, "display", "grid");
    setImportant(preview, "height", "100%");
    setImportant(preview, "min-height", "0");
    setImportant(preview, "overflow", "hidden");

    setImportant(side, "grid-area", "side");
    setImportant(side, "display", "grid");
    setImportant(side, "height", "100%");
    setImportant(side, "overflow", "auto");

    if (main.firstElementChild?.id !== PREVIEW_ID) main.prepend(preview);
    if (frame) {
      setImportant(frame, "width", "100%");
      setImportant(frame, "height", "100%");
      setImportant(frame, "display", "block");
      setImportant(frame, "border", "0");
    }
    return true;
  }

  function bindOnce(el, eventName, key, handler) {
    if (!el || el.dataset[key]) return;
    el.dataset[key] = "true";
    el.addEventListener(eventName, handler);
  }

  function clickInsideFrame(selectors) {
    const frame = $(FRAME_ID);
    try {
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc) return false;
      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (el && typeof el.click === "function") {
          el.click();
          return true;
        }
      }
    } catch {}
    return false;
  }

  function startFallbackTimer() {
    clearTimeout(state.fallbackTimer);
    state.fallbackTimer = setTimeout(() => {
      if (state.frameLoaded) return;
      const status = $(STATUS_ID);
      const fallback = $(FALLBACK_ID);
      if (status) status.textContent = "preview lento";
      if (fallback) fallback.style.display = "grid";
    }, 9000);
  }

  function bindControls() {
    const frame = $(FRAME_ID);
    const status = $(STATUS_ID);
    const fallback = $(FALLBACK_ID);
    const reload = () => {
      state.frameLoaded = false;
      if (status) status.textContent = "recarregando...";
      if (fallback) fallback.style.display = "none";
      if (frame) frame.src = PREVIEW_URL + "&t=" + Date.now();
      startFallbackTimer();
    };
    bindOnce($("avatarReloadPreviewV394"), "click", "boundV394", reload);
    bindOnce($("avatarReloadSideV394"), "click", "boundV394", reload);
    bindOnce($("avatarFitV394"), "click", "boundV394", () => clickInsideFrame(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]));
    bindOnce($("avatarResetV394"), "click", "boundV394", () => clickInsideFrame(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]));
    const zoom = $("avatarZoomV394");
    bindOnce(zoom, "input", "boundV394", () => {
      const label = $("avatarZoomLabelV394");
      if (label) label.textContent = `${zoom.value}%`;
    });
    if (frame && !frame.dataset.boundFrameV394) {
      frame.dataset.boundFrameV394 = "true";
      frame.addEventListener("load", () => {
        state.frameLoaded = true;
        if (status) status.textContent = "preview pronto";
        if (fallback) fallback.style.display = "none";
        clearTimeout(state.fallbackTimer);
      });
      startFallbackTimer();
    }
  }

  function healthCheck() {
    const root = $(ROOT_ID);
    const main = $(MAIN_ID);
    const preview = $(PREVIEW_ID);
    const side = $(SIDE_ID);
    const frame = $(FRAME_ID);
    if (!root || !main || !preview || !side || !frame) {
      if (root) root.remove();
      return false;
    }
    preview.hidden = false;
    side.hidden = false;
    return applyHardLayout();
  }

  function ensureOwner() {
    if (state.applying) return;
    state.applying = true;
    try {
      injectCss();
      const host = page();
      if (!host) return;
      disableOldGlobals();
      removeOldScripts();
      removeOldNodes();
      forcePageShell(host);
      let root = $(ROOT_ID);
      if (!root) {
        root = buildRoot();
        host.prepend(root);
        log("owner v39.4 criado");
      }
      hideNonOwner(host);
      if (!healthCheck()) {
        root = buildRoot();
        host.prepend(root);
        hideNonOwner(host);
        applyHardLayout();
      }
      bindControls();
    } finally {
      state.applying = false;
    }
  }

  function scheduleEnsure() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(ensureOwner, 80);
  }

  function installGuard() {
    const host = page();
    if (!host || state.observerInstalled || host.__avatarDesignV394Guard) return;
    state.observerInstalled = true;
    host.__avatarDesignV394Guard = true;
    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(host, { childList: true });
  }

  function boot() {
    ensureOwner();
    installGuard();
    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-target='avatar'], [data-tab='avatar']");
      if (tab) setTimeout(ensureOwner, 60);
    });
    window.addEventListener("resize", applyHardLayout);
    window.AvatarDesignOwnerV394 = { version: VERSION, ensure: ensureOwner, layout: applyHardLayout, healthCheck, state };
    log("ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
