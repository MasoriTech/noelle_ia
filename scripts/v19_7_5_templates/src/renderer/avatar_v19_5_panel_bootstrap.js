(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_7_5_AVATAR_CLEAN_CAROUSEL_2026";
  const STYLE_ID = "noelle-v19-7-5-avatar-clean-style";
  const ROOT_ATTR = "data-noelle-v19-7-5-avatar-clean";

  function allText() {
    return String(document.body?.innerText || "");
  }

  function isAvatarPage() {
    const text = allText();
    return /\bAvatar\b/i.test(text) && (/Selecionar avatar/i.test(text) || /Avatar\s*·\s*Noelle/i.test(text) || /Noelle Companion 2026/i.test(text));
  }

  function findHost() {
    const headers = Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']"));
    const avatarHeader = headers.find((h) => /^Avatar$/i.test(String(h.textContent || "").trim()) || /Selecionar avatar/i.test(String(h.textContent || "")));
    if (avatarHeader) {
      const candidates = [avatarHeader.closest("main"), avatarHeader.closest("section"), avatarHeader.parentElement?.parentElement, avatarHeader.parentElement].filter(Boolean);
      for (const candidate of candidates) {
        if (candidate && candidate !== document.body && candidate.querySelector) return candidate;
      }
    }
    return document.querySelector("main") || document.body;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "[" + ROOT_ATTR + "] { width: min(100%, 1320px); height: min(82vh, 860px); min-height: 720px; margin: 18px 0; border: 1px solid rgba(255,80,137,.28); border-radius: 26px; overflow: hidden; background: #080711; box-shadow: 0 20px 70px rgba(0,0,0,.32); }",
      "[" + ROOT_ATTR + "] iframe { width: 100%; height: 100%; border: 0; display: block; background: transparent; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function removeOldPanels() {
    const selectors = [
      "[data-noelle-v19-4-avatar-panel]",
      "[data-noelle-v19-4-1-avatar-panel]",
      "[data-noelle-v19-5-avatar-panel]",
      "[data-noelle-v19-7-avatar-modes]",
      ".av195-root",
      ".noelle-avatar-mode-router"
    ];
    for (const el of Array.from(document.querySelectorAll(selectors.join(",")))) {
      if (!el.hasAttribute(ROOT_ATTR)) el.remove();
    }
  }

  function ensurePanel() {
    injectStyle();
    removeOldPanels();
    if (!isAvatarPage()) {
      for (const el of Array.from(document.querySelectorAll("[" + ROOT_ATTR + "]"))) el.remove();
      return;
    }
    if (document.querySelector("[" + ROOT_ATTR + "]")) return;
    const host = findHost();
    const root = document.createElement("section");
    root.setAttribute(ROOT_ATTR, "1");
    root.innerHTML = '<iframe title="Avatar limpo com carrossel" src="./avatar_lab_v19_6.html?embed=1"></iframe>';
    host.appendChild(root);
  }

  function start() {
    if (window.__NOELLE_V19_7_5_AVATAR_CLEAN_STARTED__) return;
    window.__NOELLE_V19_7_5_AVATAR_CLEAN_STARTED__ = true;
    ensurePanel();
    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(ensurePanel, 120);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setInterval(ensurePanel, 1800);
    console.log("[Noelle] Avatar limpo com carrossel ativo", PATCH_ID);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__NOELLE_V19_7_5_AVATAR_CLEAN__ = PATCH_ID;
})();
