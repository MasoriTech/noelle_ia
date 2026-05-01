
(() => {
"use strict";

console.log("[avatar-legacy-blocker] scanning for legacy avatar mounts...");

const legacyIds = [
  "avatarPreview",
  "avatarShell"
];

legacyIds.forEach(id => {

  const el = document.getElementById(id);

  if (!el) return;

  // keep modern renderer mounts
  if (el.dataset?.version === "fileload") return;

  console.log("[avatar-legacy-blocker] removing:", id);

  el.remove();

});

// block legacy bootstrap redirect flag if present
try {
  window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = false;
} catch {}

console.log("[avatar-legacy-blocker] legacy avatar disabled successfully");

})();
