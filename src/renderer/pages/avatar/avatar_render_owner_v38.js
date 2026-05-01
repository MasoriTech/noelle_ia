(() => {
  "use strict";

  /*
    Avatar Render Owner V38
    ÚNICO responsável por montar a aba Avatar.

    Regra:
    - este arquivo cria a janela
    - este arquivo cria o iframe
    - nenhum outro avatar_page/layout/carousel/size runtime deve montar UI
    - o renderer interno continua sendo o Loadfile v19.8.3
  */

  const PAGE_SELECTOR = '[data-page="avatar"]';
  const ROOT_ID = "avatarRenderOwnerV38";
  const FRAME_ID = "avatarRenderFrameV38";
  const PREVIEW_URL = "./avatar_loadfile_preview_v19_8_3.html?owner=v38";

  const OLD_NODE_IDS = [
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
    "avatar_loadfile_size_640"
  ];

  function log(...args) {
    console.log("[avatar-owner-v38]", ...args);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
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
      window.__YORU_AVATAR_RENDER_OWNER__ = "v38";
      window.__YORU_AVATAR_OWNER_WIDTH_PATCH__ = "AVATAR_OWNER_WIDTH_V38_1";
    } catch {}
  }

  function removeOldScripts() {
    document.querySelectorAll("script[src]").forEach((script) => {
      const src = script.getAttribute("src") || "";

      if (src.includes("avatar_render_owner_v38.js")) return;

      if (OLD_SCRIPT_PARTS.some((part) => src.includes(part))) {
        script.remove();
        log("script antigo removido:", src);
      }
    });
  }

  function removeOldNodes() {
    OLD_NODE_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.remove();
        log("node antigo removido:", id);
      }
    });

    document.querySelectorAll("#errorBox, .error-box").forEach((el) => {
      const text = el.textContent || "";
      if (/avatar|renderer|bundle|carousel|loadfile/i.test(text)) {
        el.remove();
      }
    });
  }

  function hideNonOwnerChildren(page) {
    [...page.children].forEach((child) => {
      if (child.id === ROOT_ID) {
        child.hidden = false;
        child.style.display = "grid";
        return;
      }

      if (child.tagName === "SCRIPT") return;

      child.hidden = true;
      child.style.display = "none";
      child.dataset.hiddenByAvatarOwnerV38 = "true";
    });
  }

  function forcePageShell(page) {
    page.style.setProperty("display", "block", "important");
    page.style.setProperty("width", "100%", "important");
    page.style.setProperty("height", "100%", "important");
    page.style.setProperty("min-width", "0", "important");
    page.style.setProperty("min-height", "0", "important");
    page.style.setProperty("max-width", "none", "important");
    page.style.setProperty("overflow", "hidden", "important");
    page.style.setProperty("padding", "12px 18px 14px", "important");
    page.style.setProperty("box-sizing", "border-box", "important");
  }

  function buildRoot() {
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.avatarOwner = "v38";
    root.style.cssText = `
      width:min(100%, 1120px);
      max-width:1120px;
      margin:0 auto;
      height:calc(100vh - 145px);
      min-height:560px;
      display:grid;
      grid-template-rows:54px minmax(0, 1fr);
      gap:10px;
      overflow:hidden;
      box-sizing:border-box;
    `;

    root.innerHTML = `
      <div id="avatarOwnerHeaderV38" style="
        height:54px;
        min-height:54px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        overflow:hidden;
      ">
        <div style="min-width:0;">
          <div style="
            height:13px;
            font-size:11px;
            line-height:13px;
            letter-spacing:.18em;
            text-transform:uppercase;
            color:#e7b7ff;
            font-weight:900;
            margin-bottom:4px;
          ">Avatar VRM</div>

          <h1 style="
            height:32px;
            font-size:30px;
            line-height:32px;
            margin:0;
            letter-spacing:-.04em;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">Avatar Loadfile</h1>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex:0 0 auto;">
          <button id="avatarOwnerReloadV38" type="button" style="
            height:38px;
            min-height:38px;
            padding:0 14px;
            border-radius:999px;
            border:1px solid rgba(255,122,200,.28);
            color:#fff;
            background:rgba(255,255,255,.06);
            font-size:14px;
            font-weight:800;
            cursor:pointer;
          ">Recarregar</button>

          <div id="avatarOwnerStatusV38" style="
            height:38px;
            min-height:38px;
            padding:0 14px;
            border-radius:999px;
            border:1px solid rgba(255,122,200,.28);
            color:#f6c2e5;
            background:rgba(255,255,255,.04);
            font-size:14px;
            font-weight:800;
            display:flex;
            align-items:center;
            white-space:nowrap;
          ">owner v38</div>
        </div>
      </div>

      <div id="avatarOwnerShellV38" style="
        width:100%;
        height:100%;
        min-height:0;
        position:relative;
        border-radius:18px;
        overflow:hidden;
        background:#080810;
        border:1px solid rgba(255,122,200,.22);
        box-shadow:0 20px 60px rgba(0,0,0,.25);
        box-sizing:border-box;
      ">
        <iframe
          id="${FRAME_ID}"
          title="Avatar Loadfile Preview"
          src="${PREVIEW_URL}"
          style="width:100%;height:100%;border:0;display:block;background:#080810;"
          allow="fullscreen">
        </iframe>
      </div>
    `;

    return root;
  }

  function ensureOwner() {
    const page = getPage();

    if (!page) {
      log("página Avatar não encontrada");
      return;
    }

    disableOldGlobals();
    removeOldScripts();
    removeOldNodes();
    forcePageShell(page);

    let root = document.getElementById(ROOT_ID);

    if (!root) {
      root = buildRoot();
      page.prepend(root);
      log("janela única criada");
    }

    hideNonOwnerChildren(page);

    const frame = document.getElementById(FRAME_ID);
    const status = document.getElementById("avatarOwnerStatusV38");
    const reload = document.getElementById("avatarOwnerReloadV38");

    if (frame && !frame.dataset.boundV38) {
      frame.dataset.boundV38 = "true";

      frame.addEventListener("load", () => {
        if (status) status.textContent = "preview carregado";
      });
    }

    if (reload && frame && !reload.dataset.boundV38) {
      reload.dataset.boundV38 = "true";

      reload.addEventListener("click", () => {
        if (status) status.textContent = "recarregando...";
        frame.src = PREVIEW_URL + "&t=" + Date.now();
      });
    }
  }

  function installGuard() {
    const page = getPage();
    if (!page || page.__avatarOwnerV38Guard) return;

    page.__avatarOwnerV38Guard = true;

    const observer = new MutationObserver(() => {
      ensureOwner();
    });

    observer.observe(page, { childList: true });
  }

  function boot() {
    ensureOwner();
    installGuard();

    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-target='avatar'], [data-tab='avatar']");
      if (tab) setTimeout(ensureOwner, 60);
    });

    window.addEventListener("resize", ensureOwner);

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();