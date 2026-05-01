(() => {
  "use strict";
  const params = new URLSearchParams(window.location.search || "");
  const clean = (v, f = "") => String(v || f).replace(/[\u0000-\u001f<>"']/g, "").trim();
  const cfg = Object.freeze({
    version: "loadfile-v40",
    avatarPath: clean(params.get("avatar") || params.get("vrm") || params.get("model"), "assets/Noelle.vrm"),
    avatarName: clean(params.get("avatarName"), "Noelle"),
    avatarType: clean(params.get("avatarType"), "vrm").toLowerCase(),
    scenePath: clean(params.get("scene"), ""),
    sceneName: clean(params.get("sceneName"), ""),
    safeMode: params.get("safe") === "1"
  });
  window.__NOELLE_LOADFILE_V40_CONFIG__ = cfg;
  window.__NOELLE_ACTIVE_AVATAR_V40__ = cfg.avatarPath;
  const clickFirst = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && typeof el.click === "function") { el.click(); return true; }
    }
    return false;
  };
  window.addEventListener("message", (event) => {
    const data = event && event.data ? event.data : {};
    const source = String(data.source || "");
    if (!source.startsWith("avatar-") && !source.startsWith("loadfile-")) return;
    if (data.action === "fit") clickFirst(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
    if (data.action === "reset") clickFirst(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
    if (data.action === "camera") window.__NOELLE_LOADFILE_V40_CAMERA__ = data.camera || "front";
    if (data.action === "light") window.__NOELLE_LOADFILE_V40_LIGHT__ = Number(data.value || 75);
    if (data.action === "background") window.__NOELLE_LOADFILE_V40_BACKGROUND__ = data.value || "grid";
  });
  console.log("[loadfile-v40] bridge ativo", cfg);
})();