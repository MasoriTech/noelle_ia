'use strict';
(() => {
  if (window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__) return;
  window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = true;
  const inject = () => {
    if (document.getElementById('noelle-avatar-tab-v1978-runtime-script')) return;
    const script = document.createElement('script');
    script.id = 'noelle-avatar-tab-v1978-runtime-script';
    script.src = './renderer/noelle_avatar_tab_v19_7_8_runtime.js';
    script.defer = true;
    (document.head || document.documentElement).appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
