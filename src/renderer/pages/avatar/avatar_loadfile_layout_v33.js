(() => {
  "use strict";

  const VERSION = "v33";
  const STYLE_ID = "avatarLoadfileLayoutPolishV33Style";

  function log(...args) {
    console.log("[avatar-layout-v33]", ...args);
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;

    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "./renderer/pages/avatar/avatar_loadfile_layout_v33.css";

    document.head.appendChild(link);
  }

  function setImportant(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, "important");
  }

  function getRoot() {
    return document.getElementById("avatarLoadfileWorkingV1983");
  }

  function applyLayout() {
    const page = document.querySelector('[data-page="avatar"]');
    const root = getRoot();
    const shell = document.getElementById("avatarLoadfileShellWorking");
    const frame = document.getElementById("avatarLoadfileWorkingFrameV1983");
    const note = document.getElementById("avatarLoadfileNoteWorking");

    if (!page || !root) return;

    page.dataset.avatarLayout = VERSION;
    root.dataset.avatarLayout = VERSION;

    setImportant(page, "overflow", "hidden");
    setImportant(page, "padding", "18px 22px 22px");
    setImportant(page, "box-sizing", "border-box");

    setImportant(root, "max-width", "1440px");
    setImportant(root, "margin", "0 auto");
    setImportant(root, "display", "grid");
    setImportant(root, "grid-template-rows", "auto minmax(420px, 1fr) auto");
    setImportant(root, "gap", "12px");
    setImportant(root, "min-height", "calc(100vh - 190px)");
    setImportant(root, "max-height", "calc(100vh - 150px)");

    if (shell) {
      setImportant(shell, "width", "100%");
      setImportant(shell, "height", "auto");
      setImportant(shell, "aspect-ratio", "16 / 9");
      setImportant(shell, "min-height", "0");
      setImportant(shell, "border-radius", "18px");
      setImportant(shell, "overflow", "hidden");
    }

    if (frame) {
      setImportant(frame, "width", "100%");
      setImportant(frame, "height", "100%");
      setImportant(frame, "display", "block");
    }

    if (note && window.innerHeight < 780) {
      setImportant(note, "display", "none");
    }

    const status = document.getElementById("avatarLoadfileStatusWorking");
    if (status && !status.dataset.layoutV33) {
      status.dataset.layoutV33 = "true";
      status.title = "Layout ajustado v33";
    }
  }

  function boot() {
    injectCss();
    applyLayout();

    const observer = new MutationObserver(() => applyLayout());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", applyLayout);

    document.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-target='avatar'], [data-tab='avatar']");
      if (btn) setTimeout(applyLayout, 80);
    });

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();