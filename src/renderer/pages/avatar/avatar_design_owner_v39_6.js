(() => {
  "use strict";

  const VERSION = "v39.6";
  const PAGE_SELECTOR = '[data-page="avatar"]';

  const HOST_ID = "avatarDesignHostV396";
  const ROOT_ID = "avatarDesignRootV396";
  const MAIN_ID = "avatarDesignMainV396";
  const PREVIEW_ID = "avatarPreviewCardV396";
  const SIDE_ID = "avatarSidePanelV396";
  const FRAME_ID = "avatarDesignFrameV396";
  const STATUS_ID = "avatarDesignStatusV396";
  const FALLBACK_ID = "avatarDesignFallbackV396";

  const PREVIEW_URL = "./avatar_loadfile_preview_v19_8_3.html?owner=v39_6";
  const CSS_URL = "./renderer/pages/avatar/avatar_design_v39_6.css";

  const OLD_NODE_IDS = [
    "avatarDesignOwnerV395",
    "avatarDesignOwnerV394",
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
    "avatar_design_owner_v39_4.js",
    "avatar_design_owner_v39_5.js",
    "avatar_loadfile_size_640"
  ];

  const DESIGN = Object.freeze({
    rootHeight: "calc(100vh - 148px)",
    minHeight: "620px"
  });

  const state = {
    applying: false,
    frameLoaded: false,
    debounceTimer: null,
    fallbackTimer: null,
    repairCount: 0
  };

  function log(...args) {
    console.log("[avatar-v39.6]", ...args);
  }

  function warn(...args) {
    console.warn("[avatar-v39.6]", ...args);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function q(shadow, selector) {
    return shadow ? shadow.querySelector(selector) : null;
  }

  function setImportant(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, "important");
  }

  function setMany(el, styles) {
    if (!el) return;
    Object.keys(styles).forEach((key) => setImportant(el, key, styles[key]));
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
    } catch (err) {
      warn("falha ao desativar globals antigos", err);
    }
  }

  function removeOldScripts() {
    document.querySelectorAll("script[src]").forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (src.includes("avatar_design_owner_v39_6.js")) return;
      if (OLD_SCRIPT_PARTS.some((part) => src.includes(part))) script.remove();
    });
  }

  function removeOldNodes() {
    OLD_NODE_IDS.forEach((id) => {
      const el = byId(id);
      if (el) el.remove();
    });

    document.querySelectorAll("#errorBox, .error-box").forEach((el) => {
      const text = el.textContent || "";
      if (/avatar|renderer|bundle|carousel|loadfile/i.test(text)) el.remove();
    });
  }

  function forcePageShell(page) {
    setMany(page, {
      display: "block",
      width: "100%",
      height: "100%",
      "min-width": "0",
      "min-height": "0",
      "max-width": "none",
      overflow: "hidden",
      padding: "12px 18px 14px",
      "box-sizing": "border-box"
    });
  }

  function hideNonHostChildren(page) {
    Array.from(page.children).forEach((child) => {
      if (child.id === HOST_ID) {
        child.hidden = false;
        setImportant(child, "display", "block");
        return;
      }

      if (child.tagName === "SCRIPT") return;

      child.hidden = true;
      setImportant(child, "display", "none");
      child.dataset.hiddenByAvatarV396 = "true";
    });
  }

  function createHost(page) {
    let host = byId(HOST_ID);

    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.dataset.avatarOwner = VERSION;
      page.prepend(host);
    }

    setMany(host, {
      display: "block",
      width: "100%",
      height: DESIGN.rootHeight,
      "min-height": DESIGN.minHeight,
      "min-width": "0",
      overflow: "hidden",
      "box-sizing": "border-box"
    });

    if (!host.shadowRoot) {
      host.attachShadow({ mode: "open" });
    }

    return host;
  }

  function html() {
    return `
      <link rel="stylesheet" href="${CSS_URL}">
      <section id="${ROOT_ID}" class="av396-root">
        <header class="av396-header">
          <div>
            <h1 class="av396-title">Avatar</h1>
            <p class="av396-subtitle">Gerencie e visualize seu avatar 3D em tempo real.</p>
          </div>

          <div class="av396-header-actions">
            <div class="av396-pill"><span class="av396-dot"></span>Status</div>
            <button id="avatarOpenWidgetTopV396" class="av396-button primary" type="button">Abrir Widget ↗</button>
          </div>
        </header>

        <main id="${MAIN_ID}" class="av396-main">
          <section id="${PREVIEW_ID}" class="av396-preview">
            <div class="av396-preview-toolbar">
              <div class="av396-preview-title-wrap">
                <strong class="av396-preview-title">Preview do Avatar</strong>
                <span class="av396-chip">Noelle</span>
              </div>

              <div class="av396-preview-title-wrap">
                <span id="${STATUS_ID}" class="av396-chip">preview iniciando</span>
                <button id="avatarReloadPreviewV396" class="av396-button" type="button">↻</button>
              </div>
            </div>

            <div class="av396-frame-shell">
              <iframe id="${FRAME_ID}" class="av396-frame" title="Avatar Loadfile Preview" src="${PREVIEW_URL}" allow="fullscreen"></iframe>

              <div id="${FALLBACK_ID}" class="av396-fallback">
                <div>
                  <strong>Preview não carregou</strong>
                  <span>Verifique <code>src/avatar_loadfile_preview_v19_8_3.html</code>.</span>
                </div>
              </div>
            </div>

            <div class="av396-preview-footer">
              <span>avatar: assets/Noelle.vrm</span>
              <span>Use scroll para zoom • botão direito para mover câmera</span>
            </div>
          </section>

          <aside id="${SIDE_ID}" class="av396-side">
            <section class="av396-panel">
              <div class="av396-panel-head">
                <h2 class="av396-panel-title">Informações do Avatar</h2>
                <span class="av396-caret">⌃</span>
              </div>

              <div class="av396-info-grid">
                <div class="av396-avatar-icon">👑</div>
                <div class="av396-info-rows">
                  <div class="av396-row"><span>Nome</span><strong>Noelle</strong></div>
                  <div class="av396-row"><span>Arquivo</span><strong>Noelle.vrm</strong></div>
                  <div class="av396-row"><span>Tipo</span><strong>Humanoide</strong></div>
                  <div class="av396-row"><span>Estado</span><strong>Carregado</strong></div>
                </div>
              </div>
            </section>

            <section class="av396-panel">
              <div class="av396-panel-head">
                <h2 class="av396-panel-title">Controles de Visualização</h2>
                <span class="av396-caret">⌃</span>
              </div>

              <div class="av396-form-grid">
                <label class="av396-control-row">
                  Zoom
                  <input id="avatarZoomV396" class="av396-range" type="range" min="50" max="160" value="100">
                  <span id="avatarZoomLabelV396">100%</span>
                </label>

                <label class="av396-control-row two">
                  Pose
                  <select class="av396-select">
                    <option>T-Pose</option>
                    <option>Idle</option>
                    <option>Preview</option>
                  </select>
                </label>

                <div class="av396-control-row two">
                  Fundo
                  <div class="av396-bg-buttons">
                    <button class="av396-bg-button active" type="button">▦</button>
                    <button class="av396-bg-button" type="button"></button>
                    <button class="av396-bg-button" type="button" style="background:linear-gradient(135deg,#211329,#55315f);"></button>
                  </div>
                </div>
              </div>
            </section>

            <section class="av396-panel">
              <div class="av396-panel-head">
                <h2 class="av396-panel-title">Câmera</h2>
                <span class="av396-caret">⌃</span>
              </div>

              <div class="av396-camera-grid">
                <button class="av396-button primary" type="button">Frontal</button>
                <button class="av396-button" type="button">Esquerda</button>
                <button class="av396-button" type="button">Direita</button>
                <button class="av396-button" type="button">Superior</button>
                <button id="avatarFitV396" class="av396-button" type="button">Enquadrar</button>
                <button id="avatarResetV396" class="av396-button" type="button">Reset</button>
              </div>
            </section>

            <section class="av396-panel">
              <div class="av396-panel-head">
                <h2 class="av396-panel-title">Iluminação</h2>
                <span class="av396-caret">⌃</span>
              </div>

              <label class="av396-control-row">
                Intensidade
                <input class="av396-range" type="range" min="0" max="100" value="75">
                <span>75%</span>
              </label>
            </section>

            <section class="av396-panel">
              <div class="av396-panel-head">
                <h2 class="av396-panel-title">Ações rápidas</h2>
                <span class="av396-caret">⌃</span>
              </div>

              <div class="av396-form-grid">
                <button id="avatarReloadSideV396" class="av396-button" type="button">Recarregar Avatar</button>
                <button id="avatarOpenWidgetSideV396" class="av396-button primary" type="button">Abrir Widget</button>
              </div>
            </section>
          </aside>
        </main>
      </section>
    `;
  }

  function buildShadow(host) {
    const shadow = host.shadowRoot;
    if (!shadow) return null;

    shadow.innerHTML = html();
    return shadow;
  }

  function getShadow() {
    const host = byId(HOST_ID);
    return host ? host.shadowRoot : null;
  }

  function callInsideFrame(selectors) {
    const shadow = getShadow();
    const frame = q(shadow, "#" + FRAME_ID);

    try {
      const doc = frame && (frame.contentDocument || frame.contentWindow.document);
      if (!doc) return false;

      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (el && typeof el.click === "function") {
          el.click();
          return true;
        }
      }
    } catch (err) {
      warn("não foi possível enviar comando para iframe", err && err.message ? err.message : err);
    }

    return false;
  }

  function bindOnce(el, eventName, key, handler) {
    if (!el || el.dataset[key]) return;
    el.dataset[key] = "true";
    el.addEventListener(eventName, handler);
  }

  function startFallbackTimer() {
    clearTimeout(state.fallbackTimer);

    state.fallbackTimer = setTimeout(() => {
      if (state.frameLoaded) return;

      const shadow = getShadow();
      const status = q(shadow, "#" + STATUS_ID);
      const fallback = q(shadow, "#" + FALLBACK_ID);

      if (status) status.textContent = "preview lento";
      if (fallback) fallback.style.display = "grid";
    }, 9000);
  }

  function bindControls(shadow) {
    const frame = q(shadow, "#" + FRAME_ID);
    const status = q(shadow, "#" + STATUS_ID);
    const fallback = q(shadow, "#" + FALLBACK_ID);

    const reload = () => {
      state.frameLoaded = false;
      if (status) status.textContent = "recarregando...";
      if (fallback) fallback.style.display = "none";
      if (frame) frame.src = PREVIEW_URL + "&t=" + Date.now();
      startFallbackTimer();
    };

    bindOnce(q(shadow, "#avatarReloadPreviewV396"), "click", "boundV396", reload);
    bindOnce(q(shadow, "#avatarReloadSideV396"), "click", "boundV396", reload);

    bindOnce(q(shadow, "#avatarFitV396"), "click", "boundV396", () => {
      callInsideFrame(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
    });

    bindOnce(q(shadow, "#avatarResetV396"), "click", "boundV396", () => {
      callInsideFrame(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
    });

    const zoom = q(shadow, "#avatarZoomV396");
    const zoomLabel = q(shadow, "#avatarZoomLabelV396");

    bindOnce(zoom, "input", "boundV396", () => {
      if (zoomLabel) zoomLabel.textContent = zoom.value + "%";
    });

    if (frame && !frame.dataset.boundFrameV396) {
      frame.dataset.boundFrameV396 = "true";
      frame.addEventListener("load", () => {
        state.frameLoaded = true;
        if (status) status.textContent = "preview pronto";
        if (fallback) fallback.style.display = "none";
        clearTimeout(state.fallbackTimer);
      });

      startFallbackTimer();
    }
  }

  function healthCheck(host) {
    const shadow = host.shadowRoot;
    if (!shadow) return false;

    const root = q(shadow, "#" + ROOT_ID);
    const main = q(shadow, "#" + MAIN_ID);
    const preview = q(shadow, "#" + PREVIEW_ID);
    const side = q(shadow, "#" + SIDE_ID);
    const frame = q(shadow, "#" + FRAME_ID);

    if (!root || !main || !preview || !side || !frame) return false;

    const firstElement = main.firstElementChild;
    if (firstElement !== preview) {
      main.insertBefore(preview, firstElement);
      state.repairCount += 1;
    }

    return true;
  }

  function ensureOwner() {
    if (state.applying) return;
    state.applying = true;

    try {
      const page = getPage();
      if (!page) {
        warn("página Avatar não encontrada");
        return;
      }

      disableOldGlobals();
      removeOldScripts();
      removeOldNodes();
      forcePageShell(page);

      const host = createHost(page);
      hideNonHostChildren(page);

      let shadow = host.shadowRoot;
      if (!healthCheck(host)) {
        shadow = buildShadow(host);
        state.repairCount += 1;
      }

      if (shadow) bindControls(shadow);
    } finally {
      state.applying = false;
    }
  }

  function scheduleEnsure() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(ensureOwner, 80);
  }

  function installGuard() {
    const page = getPage();
    if (!page || page.__avatarV396Guard) return;

    page.__avatarV396Guard = true;

    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(page, { childList: true });
  }

  function boot() {
    ensureOwner();
    installGuard();

    document.addEventListener("click", (event) => {
      const tab = event.target.closest && event.target.closest("[data-target='avatar'], [data-tab='avatar']");
      if (tab) setTimeout(ensureOwner, 60);
    });

    window.addEventListener("resize", ensureOwner);

    window.AvatarDesignOwnerV396 = {
      version: VERSION,
      ensure: ensureOwner,
      state
    };

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();