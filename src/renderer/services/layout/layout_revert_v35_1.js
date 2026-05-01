(() => {
  "use strict";

  function cleanupGlobalLayoutV35() {
    document.querySelectorAll('link[href*="global_layout_v35.css"], script[src*="global_layout_runtime_v35.js"]').forEach((el) => {
      el.remove();
    });

    const classes = [
      "yoru-layout-v35-root",
      "yoru-layout-v35-sidebar",
      "yoru-layout-v35-main",
      "yoru-layout-v35-topbar",
      "yoru-layout-v35-page-area"
    ];

    document.querySelectorAll("*").forEach((el) => {
      classes.forEach((cls) => el.classList?.remove?.(cls));

      if (el.dataset?.layoutRole) delete el.dataset.layoutRole;
      if (el.dataset?.layoutContract) delete el.dataset.layoutContract;
    });

    try {
      document.documentElement.style.removeProperty("--yoru-sidebar-width");
      document.documentElement.style.removeProperty("--yoru-topbar-height");
      document.documentElement.style.removeProperty("--yoru-page-padding-x");
      document.documentElement.style.removeProperty("--yoru-page-padding-y");
      document.documentElement.style.removeProperty("--yoru-content-max-width");
      document.documentElement.style.removeProperty("--yoru-ui-scale");
    } catch {}

    // Não força layout novo. Só remove o runtime global agressivo.
    console.log("[layout-revert-v35.1] global layout v35 disabled");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanupGlobalLayoutV35);
  } else {
    cleanupGlobalLayoutV35();
  }
})();