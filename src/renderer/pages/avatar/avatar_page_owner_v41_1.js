(() => {
  "use strict";

  const VERSION = "v41.1";
  const PAGE_SELECTOR = '[data-page="avatar"]';
  const HOST_ID = "avatarPageHostV411";
  const FRAME_ID = "avatarFrameV411";
  const STATUS_ID = "avatarStatusV411";
  const AVATAR_LIST_ID = "avatarListV411";
  const SCENE_LIST_ID = "sceneListV411";

  const CSS_URL = "./renderer/pages/avatar/avatar_page_v41_1.css";
  const DEFAULT_LOADFILE = "./avatar_loadfile_preview_v19_8_3.html";
  const MANIFEST_URL = "./assets/model_manifest_v41_1.json";

  const OLD_NODE_IDS = [
    "avatarPageHostV41",
    "avatarDesignHostV399",
    "avatarDesignHostV398",
    "avatarDesignHostV397",
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
    "avatar_page_owner_v41.js",
    "loadfile_runtime_bridge_v40.js",
    "avatar_design_owner_v39_9.js",
    "avatar_design_owner_v39_8.js",
    "avatar_design_owner_v39_7.js",
    "avatar_design_owner_v39_6.js",
    "avatar_design_owner_v39_5.js",
    "avatar_design_owner_v39_4.js",
    "avatar_design_owner_v39_3.js",
    "avatar_design_owner_v39_2.js",
    "avatar_design_owner_v39_1.js",
    "avatar_design_owner_v39.js",
    "avatar_render_owner_v38.js",
    "avatar_restore_loadfile_v19_8_3.js",
    "avatar_outer_size_only_v36_1.js",
    "avatar_loadfile_fixed_sizes_v36.js",
    "avatar_loadfile_true_size_v34.js",
    "avatar_carousel_mount_v31.js",
    "avatar_page_v31.js",
    "noelle_avatar_tab_v19_8_2.js"
  ];

  const defaultManifest = {
    version: "v41.1-inline-fallback",
    source: "internal",
    avatars: [
      { name: "Noelle", path: "assets/Noelle.vrm", type: "vrm", kind: "avatar", exists: true, default: true, mode: "fast" },
      { name: "Yoru", path: "assets/avatars/Yoru.vrm", type: "vrm", kind: "avatar", exists: false, expected: true },
      { name: "Nezuko Kamado", path: "assets/avatars/nezuko_kamado.glb", type: "glb", kind: "avatar", exists: false, expected: true }
    ],
    scenes: [
      { name: "Arena Chunin", path: "assets/scenes/naruto_sala_examen_chunnin.glb", type: "glb", kind: "scene", exists: false, expected: true }
    ]
  };

  const state = {
    applying: false,
    debounceTimer: null,
    frameTimer: null,
    mode: "fast",
    manifest: defaultManifest,
    activeKey: "fast:noelle"
  };

  function log(...args) {
    console.log("[avatar-v41.1]", ...args);
  }

  function warn(...args) {
    console.warn("[avatar-v41.1]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getShadow() {
    const host = byId(HOST_ID);
    return host ? host.shadowRoot : null;
  }

  function q(selector) {
    const shadow = getShadow();
    return shadow ? shadow.querySelector(selector) : null;
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

  function setImportant(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, "important");
  }

  function setMany(el, styles) {
    if (!el) return;
    Object.keys(styles).forEach((key) => setImportant(el, key, styles[key]));
  }

  function setStatus(text, warnMode = false) {
    const el = q("#" + STATUS_ID);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("warn", Boolean(warnMode));
  }

  function setFooter(text) {
    const el = q("#avatarFooterV411");
    if (el) el.textContent = text;
  }

  function removeOldNodes() {
    OLD_NODE_IDS.forEach((id) => {
      const el = byId(id);
      if (el) el.remove();
    });
  }

  function removeOldScripts() {
    document.querySelectorAll("script[src]").forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (src.includes("avatar_page_owner_v41_1.js")) return;
      if (src.includes("model_manifest_v41_1.js")) return;
      if (OLD_SCRIPT_PARTS.some((part) => src.includes(part))) script.remove();
    });
  }

  function disableOldGlobals() {
    try {
      window.__YORU_AVATAR_RENDER_OWNER__ = VERSION;
      window.__AVATAR_CAROUSEL_ACTIVE__ = false;
      window.__AVATAR_FILELOAD_RENDERER_ACTIVE__ = false;
      window.__AVATAR_RENDERER_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_V31_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_1_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_2_ACTIVE__ = false;
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_3_ACTIVE__ = false;
    } catch {}
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
      child.dataset.hiddenByAvatarV411 = "true";
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

    if (!host.shadowRoot) host.attachShadow({ mode: "open" });

    return host;
  }

  async function fetchManifestJson() {
    try {
      const res = await fetch(MANIFEST_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("manifest HTTP " + res.status);
      return await res.json();
    } catch (err) {
      warn("fetch JSON falhou", err && err.message ? err.message : err);
      return null;
    }
  }

  async function loadManifest() {
    const globalManifest = window.__NOELLE_MODEL_MANIFEST_V41_1;
    if (globalManifest && Array.isArray(globalManifest.avatars)) {
      state.manifest = globalManifest;
      return;
    }

    const jsonManifest = await fetchManifestJson();
    if (jsonManifest && Array.isArray(jsonManifest.avatars)) {
      state.manifest = jsonManifest;
      return;
    }

    state.manifest = defaultManifest;
  }

  function viewerForAvatar(avatar) {
    if (avatar.mode === "fast" || avatar.default) return DEFAULT_LOADFILE;

    const params = new URLSearchParams();
    params.set("model", avatar.path);
    params.set("name", avatar.name || "Avatar");
    params.set("type", avatar.type || "auto");

    if (String(avatar.type || "").toLowerCase() === "vrm") {
      return "./renderer/viewers/vrm_viewer_v41.html?" + params.toString();
    }

    return "./renderer/viewers/glb_viewer_v41.html?" + params.toString();
  }

  function viewerForScene(scene) {
    const params = new URLSearchParams();
    params.set("scene", scene.path);
    params.set("name", scene.name || "Scene");
    return "./renderer/viewers/scene_viewer_v41.html?" + params.toString();
  }

  function loadFrame(src, statusText) {
    const frame = q("#" + FRAME_ID);
    if (!frame) return;

    clearTimeout(state.frameTimer);
    setStatus(statusText || "carregando...");
    frame.src = src;

    state.frameTimer = setTimeout(() => {
      setStatus("viewer lento", true);
    }, 9000);
  }

  function loadFastNoelle() {
    state.mode = "fast";
    state.activeKey = "fast:noelle";
    loadFrame(DEFAULT_LOADFILE, "loadfile rápido");
    renderLists();
    setFooter("Loadfile rápido: Noelle padrão");
  }

  function selectAvatar(index) {
    const avatar = state.manifest.avatars[index];
    if (!avatar) return;

    if (avatar.exists === false) {
      setStatus("arquivo ausente", true);
      setFooter("Ausente: " + avatar.path);
      return;
    }

    if (avatar.default || avatar.mode === "fast") {
      loadFastNoelle();
      return;
    }

    state.mode = "avatar";
    state.activeKey = "avatar:" + index;
    loadFrame(viewerForAvatar(avatar), "abrindo " + avatar.name);
    renderLists();
    setFooter("Viewer separado: " + avatar.path);
  }

  function selectScene(index) {
    const scene = state.manifest.scenes[index];
    if (!scene) return;

    if (scene.exists === false) {
      setStatus("cenário ausente", true);
      setFooter("Ausente: " + scene.path);
      return;
    }

    state.mode = "scene";
    state.activeKey = "scene:" + index;
    loadFrame(viewerForScene(scene), "abrindo cenário");
    renderLists();
    setFooter("Cenário separado: " + scene.path);
  }

  function itemHtml(item, key, indexAttr) {
    const active = state.activeKey === key ? " active" : "";
    const missing = item.exists === false ? " missing" : "";
    const disabled = item.exists === false ? " disabled" : "";
    const type = item.default || item.mode === "fast" ? "FAST" : String(item.type || "auto").toUpperCase();
    const label = item.exists === false ? "AUSENTE" : type;

    return `
      <button class="av411-item${active}${missing}" type="button" ${indexAttr}${disabled}>
        <strong>${safeText(item.name || "Item")}</strong>
        <small>${safeText(label)}</small>
        <span class="av411-path">${safeText(item.path || "")}</span>
      </button>
    `;
  }

  function renderLists() {
    const avatarList = q("#" + AVATAR_LIST_ID);
    const sceneList = q("#" + SCENE_LIST_ID);
    const avatars = Array.isArray(state.manifest.avatars) ? state.manifest.avatars : [];
    const scenes = Array.isArray(state.manifest.scenes) ? state.manifest.scenes : [];

    if (avatarList) {
      avatarList.innerHTML = avatars.map((avatar, index) => {
        const key = (avatar.default || avatar.mode === "fast") ? "fast:noelle" : "avatar:" + index;
        return itemHtml(avatar, key, `data-avatar-index="${index}"`);
      }).join("");
    }

    if (sceneList) {
      sceneList.innerHTML = scenes.length ? scenes.map((scene, index) => {
        return itemHtml(scene, "scene:" + index, `data-scene-index="${index}"`);
      }).join("") : `<p class="av411-note">Nenhum cenário no manifest. Rode o checkup v41.1.</p>`;
    }

    const manifestNote = q("#manifestNoteV411");
    if (manifestNote) {
      manifestNote.textContent = "Manifest: " + (state.manifest.source || state.manifest.version || "runtime") + " • avatares " + avatars.length + " • cenários " + scenes.length;
    }
  }

  function renderHtml() {
    return `
      <link rel="stylesheet" href="${CSS_URL}">
      <section class="av411-root">
        <header class="av411-header">
          <div>
            <h1 class="av411-title">Avatar</h1>
            <p class="av411-subtitle">Loadfile rápido preservado. Manifest agora carrega por JS bridge.</p>
          </div>

          <div class="av411-actions">
            <div class="av411-pill"><span class="av411-dot"></span>Status</div>
            <button id="avatarOpenWidgetTopV411" class="av411-button primary" type="button">Abrir Widget ↗</button>
          </div>
        </header>

        <main class="av411-main">
          <section class="av411-preview">
            <div class="av411-toolbar">
              <div class="av411-title-wrap">
                <strong class="av411-preview-title">Preview</strong>
                <span class="av411-chip">v41.1</span>
              </div>

              <div class="av411-title-wrap">
                <span id="avatarStatusV411" class="av411-chip">loadfile rápido</span>
                <button id="avatarReloadV411" class="av411-button" type="button">↻</button>
              </div>
            </div>

            <div class="av411-frame-shell">
              <iframe id="avatarFrameV411" class="av411-frame" title="Avatar Preview" src="${DEFAULT_LOADFILE}" allow="fullscreen"></iframe>
            </div>

            <div class="av411-footer">
              <span id="avatarFooterV411">Loadfile rápido: Noelle padrão</span>
              <span id="manifestNoteV411">Manifest carregando...</span>
            </div>
          </section>

          <aside class="av411-side">
            <section class="av411-panel">
              <div class="av411-panel-head">
                <h2 class="av411-panel-title">Avatares</h2>
                <span class="av411-caret">⌃</span>
              </div>
              <div id="avatarListV411" class="av411-list"></div>
              <p class="av411-note">Se aparecer AUSENTE, o arquivo não está no caminho mostrado.</p>
            </section>

            <section class="av411-panel">
              <div class="av411-panel-head">
                <h2 class="av411-panel-title">Cenários</h2>
                <span class="av411-caret">⌃</span>
              </div>
              <div id="sceneListV411" class="av411-list"></div>
              <p class="av411-note">Naruto Sala Examen Chunnin é arena/cenário, não avatar.</p>
            </section>

            <section class="av411-panel">
              <div class="av411-panel-head">
                <h2 class="av411-panel-title">Ações seguras</h2>
                <span class="av411-caret">⌃</span>
              </div>
              <div class="av411-grid">
                <button id="avatarFastV411" class="av411-button primary" type="button">Noelle rápido</button>
                <button id="avatarReloadFastV411" class="av411-button" type="button">Recarregar</button>
                <button id="avatarFitV411" class="av411-button" type="button">Enquadrar</button>
                <button id="avatarResetV411" class="av411-button" type="button">Reset</button>
              </div>
            </section>

            <section class="av411-panel">
              <div class="av411-panel-head">
                <h2 class="av411-panel-title">Regra v41.1</h2>
                <span class="av411-caret">⌃</span>
              </div>
              <p class="av411-note">Loadfile antigo continua sem query. Manifest é carregado por JS para não depender de fetch JSON.</p>
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
    renderLists();
    return shadow;
  }

  function bindOnce(el, eventName, key, handler) {
    if (!el || el.dataset[key]) return;
    el.dataset[key] = "true";
    el.addEventListener(eventName, handler);
  }

  function postToFrame(payload) {
    const frame = q("#" + FRAME_ID);
    try {
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ source: "avatar-v41.1", ...payload }, "*");
        return true;
      }
    } catch {}
    return false;
  }

  function callInsideFrame(selectors) {
    const frame = q("#" + FRAME_ID);

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
    } catch {}
    return false;
  }

  function bindControls() {
    const frame = q("#" + FRAME_ID);

    bindOnce(q("#avatarFastV411"), "click", "boundV411", loadFastNoelle);

    const reloadCurrent = () => {
      const current = q("#" + FRAME_ID);
      if (current) loadFrame(current.src, "recarregando");
    };

    bindOnce(q("#avatarReloadFastV411"), "click", "boundV411", reloadCurrent);
    bindOnce(q("#avatarReloadV411"), "click", "boundV411", reloadCurrent);

    bindOnce(q("#avatarFitV411"), "click", "boundV411", () => {
      postToFrame({ action: "fit" });
      callInsideFrame(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
      setStatus("enquadrar");
    });

    bindOnce(q("#avatarResetV411"), "click", "boundV411", () => {
      postToFrame({ action: "reset" });
      callInsideFrame(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
      setStatus("reset");
    });

    bindOnce(q("#" + AVATAR_LIST_ID), "click", "boundV411", (event) => {
      const button = event.target.closest(".av411-item");
      if (!button || button.disabled) return;
      selectAvatar(Number(button.dataset.avatarIndex));
    });

    bindOnce(q("#" + SCENE_LIST_ID), "click", "boundV411", (event) => {
      const button = event.target.closest(".av411-item");
      if (!button || button.disabled) return;
      selectScene(Number(button.dataset.sceneIndex));
    });

    if (frame && !frame.dataset.boundFrameV411) {
      frame.dataset.boundFrameV411 = "true";
      frame.addEventListener("load", () => {
        clearTimeout(state.frameTimer);
        setStatus("preview pronto");
      });
    }
  }

  function healthCheck(host) {
    const shadow = host.shadowRoot;
    if (!shadow) return false;

    const frame = shadow.querySelector("#" + FRAME_ID);
    const preview = shadow.querySelector(".av411-preview");
    const side = shadow.querySelector(".av411-side");

    return Boolean(frame && preview && side);
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

      const host = createHost(page);
      hideNonHostChildren(page);

      if (!healthCheck(host)) buildShadow(host);

      renderLists();
      bindControls();
    } finally {
      state.applying = false;
    }
  }

  function scheduleEnsure() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => ensureOwner(), 80);
  }

  function installGuard() {
    const page = getPage();
    if (!page || page.__avatarV411Guard) return;

    page.__avatarV411Guard = true;
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

    window.AvatarPageOwnerV411 = {
      version: VERSION,
      ensure: ensureOwner,
      loadFastNoelle,
      selectAvatar,
      selectScene,
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