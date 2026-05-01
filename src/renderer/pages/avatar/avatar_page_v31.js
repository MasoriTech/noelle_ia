(() => {
  "use strict";

  const PAGE_SELECTOR = '[data-page="avatar"]';
  const ROOT_ID = "avatarPageV31";
  const MOUNT_ID = "avatarMount";
  const STATUS_ID = "avatarStatusV31";

  function log(...args) {
    console.log("[avatar-page-v31]", ...args);
  }

  function getPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function hideExistingAvatarChildren(page) {
    [...page.children].forEach((child) => {
      if (child.id === ROOT_ID) return;
      child.hidden = true;
      child.dataset.avatarV31Hidden = "true";
    });
  }

  function buildLayout(agentName) {
    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.dataset.avatarRuntime = "v31";
    root.innerHTML = `
      <div class="avatar-v31-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:8px 0 16px;">
        <div>
          <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#e7b7ff;font-weight:800;">Avatar VRM</div>
          <h1 style="margin:8px 0 4px;font-size:32px;line-height:1.1;">Avatar da ${agentName}</h1>
          <p style="margin:0;color:rgba(255,255,255,.72);font-size:16px;">Carousel oficial com setas para trocar personagem. Sem loader legado.</p>
        </div>
        <div id="${STATUS_ID}" style="padding:10px 14px;border:1px solid rgba(255,122,200,.28);border-radius:999px;color:#f6c2e5;background:rgba(255,255,255,.04);font-weight:700;">avatar runtime v31</div>
      </div>

      <div id="${MOUNT_ID}" style="
        width:100%;
        height:560px;
        min-height:460px;
        position:relative;
        border-radius:22px;
        overflow:hidden;
        background:#080810;
        border:1px solid rgba(255,122,200,.22);
        box-shadow:0 20px 60px rgba(0,0,0,.25);
      "></div>

      <div class="avatar-v31-notes" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px;">
        <div style="border:1px solid rgba(255,122,200,.16);border-radius:16px;padding:12px;background:rgba(255,255,255,.035);">
          <strong>Renderer</strong><br><span style="color:rgba(255,255,255,.72);">avatar carousel v19.7.6</span>
        </div>
        <div style="border:1px solid rgba(255,122,200,.16);border-radius:16px;padding:12px;background:rgba(255,255,255,.035);">
          <strong>Mount único</strong><br><span style="color:rgba(255,255,255,.72);">#avatarMount</span>
        </div>
        <div style="border:1px solid rgba(255,122,200,.16);border-radius:16px;padding:12px;background:rgba(255,255,255,.035);">
          <strong>Legacy</strong><br><span style="color:rgba(255,255,255,.72);">bloqueado</span>
        </div>
      </div>
    `;
    return root;
  }

  async function boot() {
    const page = getPage();

    if (!page) {
      log("avatar page not found");
      return;
    }

    window.AvatarLegacyBlockerV31?.run?.();

    const state = await window.AvatarConfigV31?.loadState?.() || { active_avatar: "yoru" };
    const agentName = String(state.active_avatar || "yoru")
      .replace(/(^|[-_\\s])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

    let root = document.getElementById(ROOT_ID);

    if (!root) {
      hideExistingAvatarChildren(page);
      root = buildLayout(agentName);
      page.prepend(root);
    }

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