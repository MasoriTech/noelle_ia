(() => {
  "use strict";

  const VERSION = "v39.7";
  const PAGE_SELECTOR = '[data-page="avatar"]';
  const HOST_ID = "avatarDesignHostV397";
  const ROOT_ID = "avatarDesignRootV397";
  const MAIN_ID = "avatarDesignMainV397";
  const PREVIEW_ID = "avatarPreviewCardV397";
  const FRAME_ID = "avatarDesignFrameV397";
  const STATUS_ID = "avatarDesignStatusV397";
  const FALLBACK_ID = "avatarDesignFallbackV397";
  const AVATAR_LIST_ID = "avatarListV397";
  const AVATAR_NAME_ID = "avatarNameV397";
  const AVATAR_FILE_ID = "avatarFileV397";
  const FOOTER_PATH_ID = "avatarFooterPathV397";

  const CSS_URL = "./renderer/pages/avatar/avatar_design_v39_7.css";
  const DEFAULT_PREVIEW = "./avatar_loadfile_preview_v19_8_3.html";
  const MANIFEST_URL = "./assets/avatars/avatar_manifest_v39_7.json";

  const DEFAULT_AVATARS = [
    { name: "Noelle", path: "assets/Noelle.vrm", type: "vrm", enabled: true },
    { name: "Yoru", path: "assets/avatars/Yoru.vrm", type: "vrm", enabled: true },
    { name: "Nezuko Kamado", path: "assets/avatars/nezuko_kamado.glb", type: "glb", enabled: true },
    { name: "Naruto Sala Examen", path: "assets/avatars/naruto_sala_examen_chunnin.glb", type: "glb", enabled: true }
  ];

  const OLD_NODE_IDS = [
    "avatarDesignHostV396",
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
    "avatar_design_owner_v39_6.js",
    "avatar_loadfile_size_640"
  ];

  const state = {
    applying: false,
    frameLoaded: false,
    debounceTimer: null,
    fallbackTimer: null,
    avatars: DEFAULT_AVATARS,
    activeAvatarIndex: 0,
    activeBackground: "grid"
  };

  function log(...args) {
    console.log("[avatar-v39.7]", ...args);
  }

  function warn(...args) {
    console.warn("[avatar-v39.7]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getHost() {
    return byId(HOST_ID);
  }

  function getShadow() {
    const host = getHost();
    return host ? host.shadowRoot : null;
  }

  function q(selector) {
    const shadow = getShadow();
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

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function avatarFileName(avatar) {
    const raw = avatar && avatar.path ? avatar.path : "";
    return raw.split(/[\\/]/).pop() || raw || "desconhecido";
  }

  function activeAvatar() {
    return state.avatars[state.activeAvatarIndex] || state.avatars[0] || DEFAULT_AVATARS[0];
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
      if (src.includes("avatar_design_owner_v39_7.js")) return;
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
      child.dataset.hiddenByAvatarV397 = "true";
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
      height: "calc(100vh - 148px)",
      "min-height": "620px",
      "min-width": "0",
      overflow: "hidden",
      "box-sizing": "border-box"
    });

    if (!host.shadowRoot) {
      host.attachShadow({ mode: "open" });
    }

    return host;
  }

  async function loadManifest() {
    try {
      const res = await fetch(MANIFEST_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.avatars) && data.avatars.length) {
        state.avatars = data.avatars.filter((item) => item && item.path && item.name && item.enabled !== false);
      }
    } catch {
      log("manifest não carregado; usando fallback interno");
    }
  }

  function makeAvatarUrl(avatar) {
    const params = new URLSearchParams();
    params.set("owner", "v39_7");
    params.set("avatar", avatar.path);
    params.set("avatarName", avatar.name);
    params.set("avatarType", avatar.type || "auto");
    params.set("t", Date.now().toString());
    return DEFAULT_PREVIEW + "?" + params.toString();
  }

  function renderHtml() {
    const avatar = activeAvatar();
    return `
      <link rel="stylesheet" href="${CSS_URL}">
      <section id="avatarDesignRootV397" class="av397-root">
        <header class="av397-header">
          <div>
            <h1 class="av397-title">Avatar</h1>
            <p class="av397-subtitle">Gerencie e visualize seu avatar 3D em tempo real.</p>
          </div>

          <div class="av397-header-actions">
            <div class="av397-pill"><span class="av397-dot"></span>Status</div>
            <button id="avatarOpenWidgetTopV397" class="av397-button primary" type="button">Abrir Widget ↗</button>
          </div>
        </header>

        <main id="avatarDesignMainV397" class="av397-main">
          <section id="avatarPreviewCardV397" class="av397-preview">
            <div class="av397-preview-toolbar">
              <div class="av397-preview-title-wrap">
                <strong class="av397-preview-title">Preview do Avatar</strong>
                <span id="avatarNameV397" class="av397-chip">${safeText(avatar.name)}</span>
              </div>

              <div class="av397-preview-title-wrap">
                <span id="avatarDesignStatusV397" class="av397-chip">preview iniciando</span>
                <button id="avatarReloadPreviewV397" class="av397-button" type="button">↻</button>
              </div>
            </div>

            <div class="av397-frame-shell">
              <iframe id="avatarDesignFrameV397" class="av397-frame" title="Avatar Loadfile Preview" src="${makeAvatarUrl(avatar)}" allow="fullscreen"></iframe>

              <div id="avatarDesignFallbackV397" class="av397-fallback">
                <div>
                  <strong>Preview não carregou</strong>
                  <span>Verifique <code>src/avatar_loadfile_preview_v19_8_3.html</code>.</span>
                </div>
              </div>
            </div>

            <div class="av397-preview-footer">
              <span id="avatarFooterPathV397">avatar: ${safeText(avatar.path)}</span>
              <span>Use scroll para zoom • botão direito para mover câmera</span>
            </div>
          </section>

          <aside id="avatarSidePanelV397" class="av397-side">
            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Trocar Avatar</h2>
                <span class="av397-caret">⌃</span>
              </div>
              <div id="avatarListV397" class="av397-avatar-list"></div>
              <p class="av397-status-note">VRM deve funcionar direto. GLB aparece na lista e será enviado ao preview se ele aceitar GLB.</p>
            </section>

            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Informações do Avatar</h2>
                <span class="av397-caret">⌃</span>
              </div>

              <div class="av397-info-grid">
                <div class="av397-avatar-icon">👑</div>
                <div class="av397-info-rows">
                  <div class="av397-row"><span>Nome</span><strong id="avatarInfoNameV397">${safeText(avatar.name)}</strong></div>
                  <div class="av397-row"><span>Arquivo</span><strong id="avatarInfoFileV397">${safeText(avatarFileName(avatar))}</strong></div>
                  <div class="av397-row"><span>Tipo</span><strong id="avatarInfoTypeV397">${safeText(String(avatar.type || "auto").toUpperCase())}</strong></div>
                  <div class="av397-row"><span>Estado</span><strong id="avatarInfoStateV397">Carregado</strong></div>
                </div>
              </div>
            </section>

            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Controles de Visualização</h2>
                <span class="av397-caret">⌃</span>
              </div>

              <div class="av397-form-grid">
                <label class="av397-control-row">
                  Zoom
                  <input id="avatarZoomV397" class="av397-range" type="range" min="50" max="160" value="100">
                  <span id="avatarZoomLabelV397">100%</span>
                </label>

                <label class="av397-control-row two">
                  Pose
                  <select id="avatarPoseV397" class="av397-select">
                    <option value="tpose">T-Pose</option>
                    <option value="idle">Idle</option>
                    <option value="preview">Preview</option>
                  </select>
                </label>

                <div class="av397-control-row two">
                  Fundo
                  <div class="av397-bg-buttons">
                    <button class="av397-bg-button active" data-bg="grid" type="button">▦</button>
                    <button class="av397-bg-button" data-bg="dark" type="button"></button>
                    <button class="av397-bg-button" data-bg="purple" type="button" style="background:linear-gradient(135deg,#211329,#55315f);"></button>
                  </div>
                </div>
              </div>
            </section>

            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Câmera</h2>
                <span class="av397-caret">⌃</span>
              </div>

              <div class="av397-camera-grid">
                <button id="avatarCamFrontV397" class="av397-button primary" type="button">Frontal</button>
                <button id="avatarCamLeftV397" class="av397-button" type="button">Esquerda</button>
                <button id="avatarCamRightV397" class="av397-button" type="button">Direita</button>
                <button id="avatarCamTopV397" class="av397-button" type="button">Superior</button>
                <button id="avatarFitV397" class="av397-button" type="button">Enquadrar</button>
                <button id="avatarResetV397" class="av397-button" type="button">Reset</button>
              </div>
            </section>

            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Iluminação</h2>
                <span class="av397-caret">⌃</span>
              </div>

              <label class="av397-control-row">
                Intensidade
                <input id="avatarLightV397" class="av397-range" type="range" min="0" max="100" value="75">
                <span id="avatarLightLabelV397">75%</span>
              </label>
            </section>

            <section class="av397-panel">
              <div class="av397-panel-head">
                <h2 class="av397-panel-title">Ações rápidas</h2>
                <span class="av397-caret">⌃</span>
              </div>

              <div class="av397-form-grid">
                <button id="avatarReloadSideV397" class="av397-button" type="button">Recarregar Avatar</button>
                <button id="avatarOpenWidgetSideV397" class="av397-button primary" type="button">Abrir Widget</button>
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
    shadow.innerHTML = renderHtml();
    renderAvatarList();
    return shadow;
  }

  function renderAvatarList() {
    const list = q("#" + AVATAR_LIST_ID);
    if (!list) return;

    list.innerHTML = state.avatars.map((avatar, index) => {
      const active = index === state.activeAvatarIndex ? " active" : "";
      return `
        <button class="av397-avatar-item${active}" type="button" data-avatar-index="${index}">
          <strong>${safeText(avatar.name)}</strong>
          <small>${safeText(String(avatar.type || "auto").toUpperCase())}</small>
        </button>
      `;
    }).join("");
  }

  function updateInfo() {
    const avatar = activeAvatar();

    const nameChip = q("#" + AVATAR_NAME_ID);
    const fileFooter = q("#" + FOOTER_PATH_ID);
    const infoName = q("#avatarInfoNameV397");
    const infoFile = q("#avatarInfoFileV397");
    const infoType = q("#avatarInfoTypeV397");
    const infoState = q("#avatarInfoStateV397");

    if (nameChip) nameChip.textContent = avatar.name;
    if (fileFooter) fileFooter.textContent = "avatar: " + avatar.path;
    if (infoName) infoName.textContent = avatar.name;
    if (infoFile) infoFile.textContent = avatarFileName(avatar);
    if (infoType) infoType.textContent = String(avatar.type || "auto").toUpperCase();
    if (infoState) infoState.textContent = "Carregando";
    renderAvatarList();
  }

  function setStatus(text) {
    const status = q("#" + STATUS_ID);
    if (status) status.textContent = text;
  }

  function currentFrame() {
    return q("#" + FRAME_ID);
  }

  function reloadFrame() {
    const avatar = activeAvatar();
    const frame = currentFrame();
    const fallback = q("#" + FALLBACK_ID);

    state.frameLoaded = false;
    setStatus("recarregando...");
    if (fallback) fallback.style.display = "none";

    if (frame) {
      frame.src = makeAvatarUrl(avatar);
    }

    updateInfo();
    startFallbackTimer();
  }

  function selectAvatar(index) {
    if (!Number.isFinite(index) || index < 0 || index >= state.avatars.length) return;

    state.activeAvatarIndex = index;

    try {
      localStorage.setItem("avatar.v39_7.activeIndex", String(index));
    } catch {}

    reloadFrame();
  }

  function loadSavedSelection() {
    try {
      const saved = Number(localStorage.getItem("avatar.v39_7.activeIndex"));
      if (Number.isFinite(saved) && saved >= 0 && saved < state.avatars.length) {
        state.activeAvatarIndex = saved;
      }
    } catch {}
  }

  function postToFrame(payload) {
    const frame = currentFrame();
    try {
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ source: "avatar-v39.7", ...payload }, "*");
        return true;
      }
    } catch {}
    return false;
  }

  function callInsideFrame(selectors) {
    const frame = currentFrame();

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

  function setFrameFilter(kind, value) {
    const frame = currentFrame();
    if (!frame) return;

    if (kind === "zoom") {
      const zoom = Number(value) / 100;
      frame.style.transformOrigin = "center center";
      frame.style.transform = "scale(" + Math.min(1.25, Math.max(0.75, zoom)) + ")";
    }
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

      setStatus("preview lento");
      const fallback = q("#" + FALLBACK_ID);
      if (fallback) fallback.style.display = "grid";
    }, 9000);
  }

  function bindControls() {
    const frame = currentFrame();
    const fallback = q("#" + FALLBACK_ID);

    bindOnce(q("#avatarReloadPreviewV397"), "click", "boundV397", reloadFrame);
    bindOnce(q("#avatarReloadSideV397"), "click", "boundV397", reloadFrame);

    bindOnce(q("#avatarFitV397"), "click", "boundV397", () => {
      postToFrame({ action: "fit" });
      callInsideFrame(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
    });

    bindOnce(q("#avatarResetV397"), "click", "boundV397", () => {
      postToFrame({ action: "reset" });
      callInsideFrame(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
    });

    [
      ["#avatarCamFrontV397", "front"],
      ["#avatarCamLeftV397", "left"],
      ["#avatarCamRightV397", "right"],
      ["#avatarCamTopV397", "top"]
    ].forEach(([selector, camera]) => {
      bindOnce(q(selector), "click", "boundV397", () => {
        postToFrame({ action: "camera", camera });
        setStatus("câmera: " + camera);
      });
    });

    const zoom = q("#avatarZoomV397");
    const zoomLabel = q("#avatarZoomLabelV397");
    bindOnce(zoom, "input", "boundV397", () => {
      if (zoomLabel) zoomLabel.textContent = zoom.value + "%";
      postToFrame({ action: "zoom", value: Number(zoom.value) });
      setFrameFilter("zoom", zoom.value);
    });

    const light = q("#avatarLightV397");
    const lightLabel = q("#avatarLightLabelV397");
    bindOnce(light, "input", "boundV397", () => {
      if (lightLabel) lightLabel.textContent = light.value + "%";
      postToFrame({ action: "light", value: Number(light.value) });
    });

    const pose = q("#avatarPoseV397");
    bindOnce(pose, "change", "boundV397", () => {
      postToFrame({ action: "pose", value: pose.value });
      setStatus("pose: " + pose.value);
    });

    const list = q("#" + AVATAR_LIST_ID);
    bindOnce(list, "click", "boundV397", (event) => {
      const button = event.target.closest(".av397-avatar-item");
      if (!button) return;
      selectAvatar(Number(button.dataset.avatarIndex));
    });

    q(".av397-bg-buttons")?.querySelectorAll("[data-bg]").forEach((button) => {
      bindOnce(button, "click", "boundV397", () => {
        q(".av397-bg-buttons")?.querySelectorAll("[data-bg]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        state.activeBackground = button.dataset.bg || "grid";
        postToFrame({ action: "background", value: state.activeBackground });
        setStatus("fundo: " + state.activeBackground);
      });
    });

    if (frame && !frame.dataset.boundFrameV397) {
      frame.dataset.boundFrameV397 = "true";
      frame.addEventListener("load", () => {
        state.frameLoaded = true;
        setStatus("preview pronto");
        if (fallback) fallback.style.display = "none";
        clearTimeout(state.fallbackTimer);

        const infoState = q("#avatarInfoStateV397");
        if (infoState) infoState.textContent = "Carregado";
      });

      startFallbackTimer();
    }
  }

  function healthCheck(host) {
    const shadow = host.shadowRoot;
    if (!shadow) return false;

    const main = shadow.querySelector("#" + MAIN_ID);
    const preview = shadow.querySelector("#" + PREVIEW_ID);
    const frame = shadow.querySelector("#" + FRAME_ID);
    const side = shadow.querySelector("#avatarSidePanelV397");

    if (!main || !preview || !frame || !side) return false;

    if (main.firstElementChild !== preview) {
      main.insertBefore(preview, main.firstElementChild);
    }

    return true;
  }

  async function ensureOwner() {
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

      await loadManifest();
      loadSavedSelection();

      const host = createHost(page);
      hideNonHostChildren(page);

      let shadow = host.shadowRoot;
      if (!healthCheck(host)) {
        shadow = buildShadow(host);
      }

      renderAvatarList();
      updateInfo();
      bindControls();
    } finally {
      state.applying = false;
    }
  }

  function scheduleEnsure() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      ensureOwner();
    }, 80);
  }

  function installGuard() {
    const page = getPage();
    if (!page || page.__avatarV397Guard) return;

    page.__avatarV397Guard = true;
    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(page, { childList: true });
  }

  function boot() {
    ensureOwner();
    installGuard();

    document.addEventListener("click", (event) => {
      const tab = event.target.closest && event.target.closest("[data-target='avatar'], [data-tab='avatar']");
      if (tab) setTimeout(() => ensureOwner(), 60);
    });

    window.addEventListener("resize", scheduleEnsure);

    window.AvatarDesignOwnerV397 = {
      version: VERSION,
      ensure: ensureOwner,
      selectAvatar,
      reloadFrame,
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