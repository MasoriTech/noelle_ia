(() => {
  "use strict";

  async function loadJson(url, fallback) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return fallback;
      return await response.json();
    } catch {
      return fallback;
    }
  }

  window.AvatarConfigV31 = {
    loadState() {
      return loadJson("./../config/avatar_state.json", {
        active_avatar: "yoru",
        view_mode: "carousel",
        renderer: "avatar_carousel_v19_7_6"
      });
    },
    loadManifest() {
      return loadJson("./../config/avatar_manifest.json", { avatars: [] });
    }
  };
})();