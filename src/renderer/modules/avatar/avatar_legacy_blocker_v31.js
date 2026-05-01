(() => {
  "use strict";

  const BLOCKED_NODE_IDS = [
    "noelleAvatarV1982",
    "avatarUnifiedWindow",
    "avatarMountV30"
  ];

  const BLOCKED_SCRIPT_PARTS = [
    "noelle_avatar_tab_v19_8_2.js",
    "avatar_renderer_restore_v27_1.js",
    "restore_avatar_carousel_runtime_v28.js",
    "avatar_window_unified_v29.js",
    "avatar_page_v30.js"
  ];

  function disableLegacyFlags() {
    try {
      window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = false;
      window.__AVATAR_FILELOAD_RENDERER_ACTIVE__ = false;
      window.__AVATAR_RENDERER_ACTIVE__ = false;
    } catch {}
  }

  function removeBlockedNodes() {
    for (const id of BLOCKED_NODE_IDS) {
      const el = document.getElementById(id);
      if (el) {
        el.remove();
        console.log("[avatar-legacy-blocker-v31] removed node:", id);
      }
    }
  }

  function removeBlockedScripts() {
    document.querySelectorAll("script[src]").forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (BLOCKED_SCRIPT_PARTS.some((part) => src.includes(part))) {
        script.remove();
        console.log("[avatar-legacy-blocker-v31] removed script:", src);
      }
    });
  }

  function run() {
    disableLegacyFlags();
    removeBlockedNodes();
    removeBlockedScripts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  window.AvatarLegacyBlockerV31 = { run };
})();