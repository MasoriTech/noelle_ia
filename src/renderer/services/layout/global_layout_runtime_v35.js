(() => {
  "use strict";

  const VERSION = "v35";
  const STYLE_ID = "globalLayoutRuntimeV35Css";

  const DEFAULTS = {
    sidebarWidth: 320,
    topbarHeight: 96,
    pagePaddingX: 22,
    pagePaddingY: 18,
    contentMaxWidth: 1480
  };

  function log(...args) {
    console.log("[global-layout-v35]", ...args);
  }

  async function loadConfig() {
    try {
      const res = await fetch("./../config/ui_layout.json", { cache: "no-store" });
      if (res.ok) return { ...DEFAULTS, ...(await res.json()) };
    } catch {}
    return DEFAULTS;
  }

  function setVar(name, value) {
    document.documentElement.style.setProperty(name, String(value));
  }

  function applyVars(config) {
    setVar("--yoru-sidebar-width", `${Number(config.sidebarWidth || DEFAULTS.sidebarWidth)}px`);
    setVar("--yoru-topbar-height", `${Number(config.topbarHeight || DEFAULTS.topbarHeight)}px`);
    setVar("--yoru-page-padding-x", `${Number(config.pagePaddingX || DEFAULTS.pagePaddingX)}px`);
    setVar("--yoru-page-padding-y", `${Number(config.pagePaddingY || DEFAULTS.pagePaddingY)}px`);
    setVar("--yoru-content-max-width", `${Number(config.contentMaxWidth || DEFAULTS.contentMaxWidth)}px`);
    setVar("--yoru-ui-scale", String(config.scale || 1));
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;

    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "./renderer/services/layout/global_layout_v35.css";
    document.head.appendChild(link);
  }

  function navButtons() {
    return [...document.querySelectorAll(".nav-item[data-target], [data-tab], [data-target]")];
  }

  function findSidebar() {
    const buttons = navButtons().filter((btn) => {
      const target = btn.dataset?.target || btn.dataset?.tab || "";
      return /home|avatar|chat|stream|settings|about|inventory|emotes/.test(target);
    });

    if (!buttons.length) return null;

    let node = buttons[0];

    for (let i = 0; i < 7 && node; i += 1) {
      const count = node.querySelectorAll?.(".nav-item[data-target], [data-tab], [data-target]")?.length || 0;
      const rect = node.getBoundingClientRect?.();
      if (count >= 5 && rect && rect.width > 180 && rect.width < 420) return node;
      node = node.parentElement;
    }

    return buttons[0].closest("aside, nav, .sidebar, .side, .left-panel") || buttons[0].parentElement;
  }

  function findPages() {
    return [...document.querySelectorAll(".page[data-page], section[data-page], [data-page].page")];
  }

  function findPageArea() {
    const pages = findPages();
    if (!pages.length) return null;

    let parent = pages[0].parentElement;
    while (parent && parent !== document.body) {
      const count = parent.querySelectorAll?.(".page[data-page], section[data-page], [data-page].page")?.length || 0;
      if (count >= 2) return parent;
      parent = parent.parentElement;
    }

    return pages[0].parentElement;
  }

  function findMain(sidebar, pageArea) {
    if (pageArea) {
      let node = pageArea;
      for (let i = 0; i < 6 && node && node !== document.body; i += 1) {
        const rect = node.getBoundingClientRect?.();
        if (rect && rect.width > 500 && rect.height > 300) return node;
        node = node.parentElement;
      }
    }

    if (sidebar?.parentElement) {
      const siblings = [...sidebar.parentElement.children].filter((el) => el !== sidebar);
      return siblings.find((el) => (el.getBoundingClientRect?.().width || 0) > 500) || null;
    }

    return null;
  }

  function findTopbar(main, pageArea) {
    if (!main || !pageArea) return null;

    const candidates = [...main.children].filter((el) => el !== pageArea);
    return candidates.find((el) => {
      const rect = el.getBoundingClientRect?.();
      return rect && rect.height > 40 && rect.height < 150 && rect.width > 500;
    }) || null;
  }

  function classifyShell() {
    const sidebar = findSidebar();
    const pageArea = findPageArea();
    const main = findMain(sidebar, pageArea);
    const topbar = findTopbar(main, pageArea);

    document.body.classList.add("yoru-layout-v35-root");

    if (sidebar) {
      sidebar.classList.add("yoru-layout-v35-sidebar");
      sidebar.dataset.layoutRole = "sidebar";
    }

    if (main) {
      main.classList.add("yoru-layout-v35-main");
      main.dataset.layoutRole = "main";
    }

    if (topbar) {
      topbar.classList.add("yoru-layout-v35-topbar");
      topbar.dataset.layoutRole = "topbar";
    }

    if (pageArea) {
      pageArea.classList.add("yoru-layout-v35-page-area");
      pageArea.dataset.layoutRole = "page-area";
    }

    findPages().forEach((page) => {
      page.dataset.layoutContract = page.dataset.page || "page";
    });

    return { sidebar, main, topbar, pageArea };
  }

  function fixActivePageHeight() {
    const pages = findPages();

    pages.forEach((page) => {
      page.style.setProperty("min-width", "0", "important");
      page.style.setProperty("min-height", "0", "important");

      if (page.classList.contains("active") || !page.hidden) {
        page.style.setProperty("height", "100%", "important");
      }
    });
  }

  function fixAvatarIframe() {
    const frame = document.getElementById("avatarLoadfileWorkingFrameV1983");
    if (!frame) return;

    frame.style.setProperty("height", "100%", "important");
    frame.style.setProperty("width", "100%", "important");

    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc || doc.getElementById("globalLayoutIframeV35")) return;

      const style = doc.createElement("style");
      style.id = "globalLayoutIframeV35";
      style.textContent = `
        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        canvas {
          max-width: 100% !important;
          max-height: 100% !important;
        }
      `;
      doc.head.appendChild(style);
    } catch {}
  }

  function applyContracts() {
    classifyShell();
    fixActivePageHeight();
    fixAvatarIframe();
  }

  async function boot() {
    injectCss();

    const config = await loadConfig();
    applyVars(config);
    applyContracts();

    const observer = new MutationObserver(() => applyContracts());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });

    window.addEventListener("resize", applyContracts);

    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("[data-target], [data-tab], .nav-item");
      if (tab) {
        setTimeout(applyContracts, 50);
        setTimeout(applyContracts, 250);
      }
    });

    window.YoruGlobalLayoutV35 = {
      version: VERSION,
      apply: applyContracts,
      classifyShell,
      loadConfig
    };

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();