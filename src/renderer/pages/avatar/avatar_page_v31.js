(() => {
  "use strict";

  const PAGE_SELECTOR = '[data-page="avatar"]';
  const ROOT_ID = "avatarPageV31";
  const MOUNT_ID = "avatarMount";
  const STATUS_ID = "avatarStatusV31";

  function log(...args) {
    console.log("[avatar-page-v31.3]", ...args);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function forcePageLayout(page) {
    page.style.display = "block";
    page.style.gridTemplateColumns = "none";
    page.style.gridAutoColumns = "unset";
    page.style.alignItems = "stretch";
    page.style.width = "100%";
    page.style.maxWidth = "none";
    page.style.overflow = "visible";
  }

  function hideEverythingExceptRoot(page) {
    [...page.children].forEach((child) => {
      if (child.id === ROOT_ID) return;
      if (child.tagName === "SCRIPT") return;
      child.hidden = true;
      child.style.display = "none";
      child.dataset.avatarV31Hidden = "true";
    });
  }

  function installMutationGuard(page) {
    if (page.__avatarV313MutationGuard) return;
    page.__avatarV313MutationGuard = true;

    const observer = new MutationObserver(() => {
      hideEverythingExceptRoot(page);
    });

    observer.observe(page, { childList: true });
  }

  function buildLayout(agentName) {
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.avatarRuntime = "v31.3-simple-carousel";
    root.style.display = "block";
    root.style.width = "100%";
    root.style.maxWidth = "none";
    root.style.gridColumn = "1 / -1";
    root.style.position = "relative";
    root.style.boxSizing = "border-box";

    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 14px;">
        <div>
          <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#e7b7ff;font-weight:900;">Avatar VRM</div>
          <h1 style="margin:8px 0 4px;font-size:34px;line-height:1.05;letter-spacing:-.04em;">Avatar da ${agentName}</h1>
          <p style="margin:0;color:rgba(255,255,255,.72);font-size:16px;">Carousel limpo com setas embaixo. Widget e controles ficam separados.</p>
        </div>
        <div id="${STATUS_ID}" style="padding:10px 14px;border:1px solid rgba(255,122,200,.28);border-radius:999px;color:#f6c2e5;background:rgba(255,255,255,.04);font-weight:800;white-space:nowrap;">carousel limpo</div>
      </div>

      <div id="${MOUNT_ID}" style="
        width:100%;
        height:min(72vh, 720px);
        min-height:560px;
        position:relative;
        border-radius:22px;
        overflow:hidden;
        background:#080810;
        border:1px solid rgba(255,122,200,.22);
        box-shadow:0 20px 60px rgba(0,0,0,.25);
        box-sizing:border-box;
      "></div>
    `;

    return root;
  }

  async function boot() {
    const page = getPage();

    if (!page) {
      log("avatar page not found");
      return;
    }

    forcePageLayout(page);
    window.AvatarLegacyBlockerV31?.run?.();

    let state = { active_avatar: "yoru" };
    try {
      state = await window.AvatarConfigV31?.loadState?.() || state;
    } catch {}

    const agentName = String(state.active_avatar || "yoru")
      .replace(/(^|[-_\\s])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

    hideEverythingExceptRoot(page);

    let root = document.getElementById(ROOT_ID);

    if (!root) {
      root = buildLayout(agentName);
      page.prepend(root);
    } else {
      root.hidden = false;
      root.style.display = "block";
    }

    hideEverythingExceptRoot(page);
    installMutationGuard(page);

    const mount = document.getElementById(MOUNT_ID);

    await window.AvatarCarouselMountV31?.mount?.(mount);

    const status = document.getElementById(STATUS_ID);
    if (status) status.textContent = "carousel ativo";

    log("boot complete");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();