(() => {
  "use strict";

  /**
   * Avatar Design Owner V39.2 Robust
   *
   * Objetivo:
   * - Um único responsável pela aba Avatar.
   * - Manter renderer funcional: src/avatar_loadfile_preview_v19_8_3.html
   * - Não tocar em Three.js, câmera, WebGL ou app interno.
   * - Separar preview à esquerda e painel de controles à direita.
   * - Ser idempotente: rodar várias vezes sem duplicar UI.
   */

  const VERSION = "v39.2";
  const PAGE_SELECTOR = '[data-page="avatar"]';
  const ROOT_ID = "avatarDesignOwnerV392";
  const FRAME_ID = "avatarDesignFrameV392";
  const FALLBACK_ID = "avatarFrameFallbackV392";
  const PREVIEW_URL = "./avatar_loadfile_preview_v19_8_3.html?owner=v39_2";

  const OLD_NODE_IDS = [
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
    "avatar_loadfile_size_640"
  ];

  const DESIGN = Object.freeze({
    rootHeight: "calc(100vh - 138px)",
    minHeight: "600px",
    previewMinWidth: "620px",
    sideWidth: "390px",
    gap: "16px",
    headerHeight: "64px",
    previewToolbarHeight: "46px"
  });

  const STATE = {
    applying: false,
    guardInstalled: false,
    frameLoaded: false,
    fallbackTimer: null,
    debounceTimer: null,
    bootCount: 0
  };

  function log(...args) {
    console.log("[avatar-design-v39.2]", ...args);
  }

  function warn(...args) {
    console.warn("[avatar-design-v39.2]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function styleObject(obj) {
    return Object.entries(obj)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}:${value};`)
      .join("");
  }

  function setImportant(el, property, value) {
    if (!el) return;
    el.style.setProperty(property, value, "important");
  }

  function safeClick(el) {
    try {
      if (el && typeof el.click === "function") {
        el.click();
        return true;
      }
    } catch {}
    return false;
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
    const scripts = [...document.querySelectorAll("script[src]")];

    for (const script of scripts) {
      const src = script.getAttribute("src") || "";

      if (src.includes("avatar_design_owner_v39_2.js")) continue;

      if (OLD_SCRIPT_PARTS.some((part) => src.includes(part))) {
        script.remove();
        log("script antigo removido:", src);
      }
    }
  }

  function removeOldNodes() {
    for (const id of OLD_NODE_IDS) {
      const el = byId(id);
      if (el) {
        el.remove();
        log("node antigo removido:", id);
      }
    }

    document.querySelectorAll("#errorBox, .error-box").forEach((el) => {
      const text = el.textContent || "";
      if (/avatar|renderer|bundle|carousel|loadfile/i.test(text)) el.remove();
    });
  }

  function forcePageShell(page) {
    setImportant(page, "display", "block");
    setImportant(page, "width", "100%");
    setImportant(page, "height", "100%");
    setImportant(page, "min-width", "0");
    setImportant(page, "min-height", "0");
    setImportant(page, "max-width", "none");
    setImportant(page, "overflow", "hidden");
    setImportant(page, "padding", "12px 18px 14px");
    setImportant(page, "box-sizing", "border-box");
  }

  function hideNonOwnerChildren(page) {
    for (const child of [...page.children]) {
      if (child.id === ROOT_ID) {
        child.hidden = false;
        child.style.display = "grid";
        continue;
      }

      if (child.tagName === "SCRIPT") continue;

      child.hidden = true;
      child.style.display = "none";
      child.dataset.hiddenByAvatarDesignV392 = "true";
    }
  }

  function makeButton(label, id, options = {}) {
    const primary = Boolean(options.primary);
    const compact = Boolean(options.compact);

    return `
      <button
        id="${id}"
        type="button"
        data-avatar-v392-button="true"
        style="${styleObject({
          "min-height": compact ? "34px" : "42px",
          "padding": compact ? "0 11px" : "0 15px",
          "border-radius": compact ? "12px" : "14px",
          "border": primary ? "1px solid rgba(255,105,190,.55)" : "1px solid rgba(255,255,255,.12)",
          "color": primary ? "#fff" : "rgba(255,255,255,.86)",
          "background": primary ? "linear-gradient(135deg, rgba(255,85,178,.86), rgba(152,72,255,.70))" : "rgba(255,255,255,.055)",
          "font-size": compact ? "12px" : "14px",
          "font-weight": "800",
          "cursor": "pointer",
          "box-shadow": primary ? "0 12px 34px rgba(255,83,178,.18)" : "none",
          "white-space": "nowrap"
        })}"
      >${label}</button>
    `;
  }

  function infoRow(key, value) {
    return `
      <div style="display:grid;grid-template-columns:92px 1fr;gap:8px;font-size:13px;line-height:1.35;">
        <span style="color:rgba(255,255,255,.48);">${key}</span>
        <strong style="color:rgba(255,255,255,.86);font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;">${value}</strong>
      </div>
    `;
  }

  function panel(title, body) {
    return `
      <section
        data-avatar-v392-panel="${title}"
        style="${styleObject({
          "border": "1px solid rgba(255,122,200,.16)",
          "background": "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          "border-radius": "18px",
          "padding": "16px",
          "box-shadow": "0 18px 44px rgba(0,0,0,.18)",
          "min-width": "0"
        })}"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;">
          <h2 style="margin:0;font-size:17px;line-height:1.1;min-width:0;">${title}</h2>
          <span style="font-size:18px;color:#d995ff;flex:0 0 auto;">⌃</span>
        </div>
        ${body}
      </section>
    `;
  }

  function buildInfoPanel() {
    return panel("Informações do Avatar", `
      <div style="display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:center;min-width:0;">
        <div style="${styleObject({
          "width": "72px",
          "height": "72px",
          "border-radius": "18px",
          "border": "1px solid rgba(255,122,200,.22)",
          "background": "radial-gradient(circle at 50% 35%, rgba(255,130,210,.30), transparent 62%), rgba(255,255,255,.045)",
          "display": "grid",
          "place-items": "center",
          "font-size": "30px",
          "flex": "0 0 auto"
        })}">👑</div>
        <div style="display:grid;gap:5px;min-width:0;">
          ${infoRow("Nome", "Noelle")}
          ${infoRow("Arquivo", "Noelle.vrm")}
          ${infoRow("Tipo", "Humanoide")}
          ${infoRow("Estado", "Carregado")}
        </div>
      </div>
    `);
  }

  function buildViewControlsPanel() {
    return panel("Controles de Visualização", `
      <div style="display:grid;gap:13px;">
        <label style="display:grid;grid-template-columns:72px minmax(0,1fr) 52px;gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Zoom
          <input id="avatarZoomFakeV392" type="range" min="50" max="160" value="100" style="width:100%;accent-color:#d262ff;">
          <span id="avatarZoomLabelV392" style="text-align:right;">100%</span>
        </label>

        <label style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Pose
          <select id="avatarPoseFakeV392" style="min-height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.12);color:#fff;background:rgba(255,255,255,.06);padding:0 10px;">
            <option>T-Pose</option>
            <option>Idle</option>
            <option>Preview</option>
          </select>
        </label>

        <div style="display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
          Fundo
          <div style="display:flex;gap:8px;min-width:0;flex-wrap:wrap;">
            <button type="button" title="Grade" style="width:42px;height:42px;border-radius:12px;border:2px solid #d262ff;background:#171222;color:#bbb;">▦</button>
            <button type="button" title="Escuro" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#120d1a;"></button>
            <button type="button" title="Roxo" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#211329,#55315f);"></button>
          </div>
        </div>
      </div>
    `);
  }

  function buildCameraPanel() {
    return panel("Câmera", `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${makeButton("Frontal", "avatarCamFrontV392", { primary: true })}
        ${makeButton("Esquerda", "avatarCamLeftV392")}
        ${makeButton("Direita", "avatarCamRightV392")}
        ${makeButton("Superior", "avatarCamTopV392")}
        ${makeButton("Enquadrar", "avatarFitSideV392")}
        ${makeButton("Reset", "avatarResetSideV392")}
      </div>
    `);
  }

  function buildLightingPanel() {
    return panel("Iluminação", `
      <label style="display:grid;grid-template-columns:84px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px;color:rgba(255,255,255,.72);">
        Intensidade
        <input type="range" min="0" max="100" value="75" style="width:100%;accent-color:#d262ff;">
        <span>75%</span>
      </label>
    `);
  }

  function buildActionsPanel() {
    return panel("Ações rápidas", `
      <div style="display:grid;gap:8px;">
        ${makeButton("Recarregar Avatar", "avatarReloadSideV392")}
        ${makeButton("Abrir Widget", "avatarOpenWidgetSideV392", { primary: true })}
      </div>
    `);
  }

  function buildSidePanel() {
    return `
      <aside id="avatarSidePanelV392" style="${styleObject({
        "min-width": "0",
        "height": "100%",
        "overflow": "auto",
        "display": "grid",
        "grid-template-rows": "auto auto auto auto minmax(0, 1fr)",
        "gap": "12px",
        "scrollbar-width": "thin",
        "padding-right": "2px"
      })}">
        ${buildInfoPanel()}
        ${buildViewControlsPanel()}
        ${buildCameraPanel()}
        ${buildLightingPanel()}
        ${buildActionsPanel()}
      </aside>
    `;
  }

  function buildRoot() {
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.avatarOwner = VERSION;
    root.style.cssText = `
      width:100%;
      height:${DESIGN.rootHeight};
      min-height:${DESIGN.minHeight};
      display:grid;
      grid-template-rows:${DESIGN.headerHeight} minmax(0, 1fr);
      gap:14px;
      overflow:hidden;
      box-sizing:border-box;
    `;

    root.innerHTML = `
      <header id="avatarDesignHeaderV392" style="${styleObject({
        "height": DESIGN.headerHeight,
        "display": "flex",
        "align-items": "center",
        "justify-content": "space-between",
        "gap": "16px",
        "overflow": "hidden",
        "min-width": "0"
      })}">
        <div style="min-width:0;">
          <h1 style="margin:0;font-size:34px;line-height:36px;letter-spacing:-.045em;color:#fff;">Avatar</h1>
          <p style="margin:4px 0 0;font-size:14px;line-height:18px;color:rgba(255,255,255,.66);">Gerencie e visualize seu avatar 3D em tempo real.</p>
        </div>

        <div style="display:flex;align-items:center;gap:12px;flex:0 0 auto;">
          <div id="avatarTopStatusV392" style="${styleObject({
            "height": "42px",
            "padding": "0 16px",
            "border-radius": "14px",
            "border": "1px solid rgba(255,255,255,.13)",
            "background": "rgba(255,255,255,.045)",
            "display": "flex",
            "align-items": "center",
            "gap": "8px",
            "font-weight": "800",
            "color": "#fff"
          })}">
            <span style="width:9px;height:9px;border-radius:999px;background:#48dd78;box-shadow:0 0 12px rgba(72,221,120,.6);"></span>
            Status
          </div>
          ${makeButton("Abrir Widget ↗", "avatarOpenWidgetTopV392", { primary: true })}
        </div>
      </header>

      <main id="avatarDesignMainV392" style="${styleObject({
        "min-height": "0",
        "display": "grid",
        "grid-template-columns": `minmax(${DESIGN.previewMinWidth}, 1fr) ${DESIGN.sideWidth}`,
        "gap": DESIGN.gap,
        "overflow": "hidden",
        "min-width": "0"
      })}">
        <section id="avatarPreviewCardV392" style="${styleObject({
          "min-width": "0",
          "min-height": "0",
          "position": "relative",
          "border-radius": "20px",
          "overflow": "hidden",
          "border": "1px solid rgba(255,122,200,.20)",
          "background": "radial-gradient(circle at 50% 25%, rgba(171,73,255,.22), transparent 40%), #080810",
          "box-shadow": "0 22px 70px rgba(0,0,0,.28)",
          "display": "grid",
          "grid-template-rows": `${DESIGN.previewToolbarHeight} minmax(0, 1fr)`
        })}">
          <div style="${styleObject({
            "height": DESIGN.previewToolbarHeight,
            "display": "flex",
            "align-items": "center",
            "justify-content": "space-between",
            "gap": "12px",
            "padding": "0 16px",
            "border-bottom": "1px solid rgba(255,122,200,.18)",
            "background": "rgba(0,0,0,.16)",
            "min-width": "0"
          })}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <strong style="font-size:15px;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;">Preview do Avatar</strong>
              <span style="border:1px solid rgba(255,122,200,.25);background:rgba(255,255,255,.055);border-radius:999px;padding:5px 10px;color:#f7c1e6;font-weight:800;font-size:12px;flex:0 0 auto;">Noelle</span>
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;">
              <span id="avatarDesignStatusV392" style="border:1px solid rgba(255,122,200,.20);background:rgba(255,255,255,.045);border-radius:999px;padding:6px 11px;color:#c8f7d8;font-weight:800;font-size:12px;white-space:nowrap;">preview iniciando</span>
              <button id="avatarDesignReloadV392" type="button" title="Recarregar" style="width:34px;height:34px;border-radius:12px;border:1px solid rgba(255,255,255,.12);color:#fff;background:rgba(255,255,255,.055);cursor:pointer;">↻</button>
            </div>
          </div>

          <div id="avatarDesignFrameShellV392" style="position:relative;min-height:0;overflow:hidden;">
            <iframe
              id="${FRAME_ID}"
              title="Avatar Loadfile Preview"
              src="${PREVIEW_URL}"
              style="width:100%;height:100%;border:0;display:block;background:#080810;"
              allow="fullscreen">
            </iframe>

            <div id="avatarLeftToolV392" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);display:grid;gap:10px;z-index:5;pointer-events:none;">
              <button type="button" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(12,10,20,.62);color:#fff;backdrop-filter:blur(12px);">⌕</button>
              <button type="button" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(12,10,20,.62);color:#fff;backdrop-filter:blur(12px);">⛶</button>
              <button type="button" style="width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(12,10,20,.62);color:#fff;backdrop-filter:blur(12px);">↺</button>
            </div>

            <div id="${FALLBACK_ID}" style="display:none;position:absolute;inset:0;place-items:center;text-align:center;padding:24px;color:#f7c1e6;background:#080810;z-index:12;">
              <div>
                <strong style="display:block;font-size:20px;margin-bottom:8px;">Preview não carregou</strong>
                <span>Verifique se existe <code>src/avatar_loadfile_preview_v19_8_3.html</code>.</span>
              </div>
            </div>
          </div>
        </section>

        ${buildSidePanel()}
      </main>
    `;

    return root;
  }

  function fitToViewport() {
    const root = byId(ROOT_ID);
    const main = byId("avatarDesignMainV392");
    const side = byId("avatarSidePanelV392");
    if (!root || !main) return;

    const compact = window.innerWidth < 1180;
    const medium = window.innerWidth < 1360;

    if (compact) {
      main.style.gridTemplateColumns = "1fr";
      main.style.overflow = "auto";
      if (side) side.style.maxHeight = "520px";
    } else if (medium) {
      main.style.gridTemplateColumns = "minmax(560px, 1fr) 340px";
      main.style.overflow = "hidden";
      if (side) side.style.maxHeight = "none";
    } else {
      main.style.gridTemplateColumns = `minmax(${DESIGN.previewMinWidth}, 1fr) ${DESIGN.sideWidth}`;
      main.style.overflow = "hidden";
      if (side) side.style.maxHeight = "none";
    }
  }

  function callInsideFrame(selectors) {
    const frame = byId(FRAME_ID);
    try {
      const doc = frame?.contentDocument || frame?.contentWindow?.document;
      if (!doc) return false;

      for (const selector of selectors) {
        const el = doc.querySelector(selector);
        if (safeClick(el)) return true;
      }
    } catch (err) {
      warn("não foi possível chamar comando dentro do iframe:", err?.message || err);
    }
    return false;
  }

  function bindOnce(el, eventName, key, handler) {
    if (!el || el.dataset[key]) return;
    el.dataset[key] = "true";
    el.addEventListener(eventName, handler);
  }

  function bindControls() {
    const frame = byId(FRAME_ID);
    const status = byId("avatarDesignStatusV392");
    const fallback = byId(FALLBACK_ID);

    const reload = () => {
      if (!frame) return;
      STATE.frameLoaded = false;
      if (status) status.textContent = "recarregando...";
      if (fallback) fallback.style.display = "none";
      frame.src = PREVIEW_URL + "&t=" + Date.now();
      startFallbackTimer();
    };

    bindOnce(byId("avatarDesignReloadV392"), "click", "boundV392", reload);
    bindOnce(byId("avatarReloadSideV392"), "click", "boundV392", reload);

    bindOnce(byId("avatarFitSideV392"), "click", "boundV392", () => {
      callInsideFrame(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
    });

    bindOnce(byId("avatarResetSideV392"), "click", "boundV392", () => {
      callInsideFrame(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
    });

    const zoom = byId("avatarZoomFakeV392");
    const zoomLabel = byId("avatarZoomLabelV392");

    bindOnce(zoom, "input", "boundV392", () => {
      if (zoomLabel) zoomLabel.textContent = `${zoom.value}%`;
    });

    if (frame && !frame.dataset.boundV392) {
      frame.dataset.boundV392 = "true";
      frame.addEventListener("load", () => {
        STATE.frameLoaded = true;
        if (status) status.textContent = "preview pronto";
        if (fallback) fallback.style.display = "none";
        clearTimeout(STATE.fallbackTimer);
      });

      startFallbackTimer();
    }
  }

  function startFallbackTimer() {
    clearTimeout(STATE.fallbackTimer);

    const status = byId("avatarDesignStatusV392");
    const fallback = byId(FALLBACK_ID);

    STATE.fallbackTimer = setTimeout(() => {
      if (STATE.frameLoaded) return;
      if (status) status.textContent = "preview lento";
      if (fallback) fallback.style.display = "grid";
    }, 9000);
  }

  function ensureOwner() {
    if (STATE.applying) return;
    STATE.applying = true;

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

      let root = byId(ROOT_ID);
      if (!root) {
        root = buildRoot();
        page.prepend(root);
        STATE.bootCount += 1;
        log("design v39.2 criado");
      }

      hideNonOwnerChildren(page);
      fitToViewport();
      bindControls();
    } finally {
      STATE.applying = false;
    }
  }

  function scheduleEnsure() {
    clearTimeout(STATE.debounceTimer);
    STATE.debounceTimer = setTimeout(ensureOwner, 80);
  }

  function installGuard() {
    const page = getPage();
    if (!page || STATE.guardInstalled || page.__avatarDesignV392Guard) return;

    STATE.guardInstalled = true;
    page.__avatarDesignV392Guard = true;

    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(page, { childList: true });
  }

  function boot() {
    ensureOwner();
    installGuard();

    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-target='avatar'], [data-tab='avatar']");
      if (tab) setTimeout(ensureOwner, 60);
    });

    window.addEventListener("resize", fitToViewport);

    window.AvatarDesignOwnerV392 = {
      version: VERSION,
      ensure: ensureOwner,
      fit: fitToViewport,
      state: STATE
    };

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();