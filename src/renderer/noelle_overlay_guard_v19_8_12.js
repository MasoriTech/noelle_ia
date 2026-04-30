/*
  Noelle/Yoru V19.8.12 — Overlay Guard
  Guarda mínimo e seguro.
  Não cria texto, não cria painel, não usa MutationObserver e não remove containers.
*/
(() => {
  'use strict';

  const VERSION = '19.8.12-stop-repeated-text-2026';

  function textOf(el) {
    return String(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.('aria-label') || '')
      .trim()
      .toLowerCase();
  }

  function hideFloatingLegacyButtons() {
    const nodes = document.querySelectorAll('button, a, [role="button"], .btn, .button, div, span');
    nodes.forEach((el) => {
      const label = textOf(el);
      if (label !== 'avatar lab' && label !== 'room v19') return;

      const style = window.getComputedStyle(el);
      const fixedParent = el.closest('[style*="position: fixed"], [style*="position:fixed"], [style*="position: absolute"], [style*="position:absolute"]');
      const floating = style.position === 'fixed' || style.position === 'absolute' || fixedParent;

      if (floating || label === 'avatar lab' || label === 'room v19') {
        el.setAttribute('data-noelle-legacy-floating', 'true');
        el.setAttribute('data-noelle-kill-floating', label === 'avatar lab' ? 'avatar-lab' : 'room-v19');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function runSafePass() {
    hideFloatingLegacyButtons();
    document.body?.classList.add('noelle-v19-8-12-safe');
    if (!document.documentElement.getAttribute('data-noelle-theme')) {
      document.documentElement.setAttribute('data-noelle-theme', 'yoru-ember');
    }
    if (document.body && !document.body.getAttribute('data-noelle-theme')) {
      document.body.setAttribute('data-noelle-theme', 'yoru-ember');
    }
  }

  function boot() {
    runSafePass();

    // Poucas passagens curtas para pegar render inicial tardio, sem loop infinito.
    [80, 250, 600, 1200].forEach((ms) => window.setTimeout(runSafePass, ms));
    window.addEventListener('resize', runSafePass, { passive: true });
    document.addEventListener('click', () => window.setTimeout(runSafePass, 60), true);

    window.noelleOverlayGuardV19812 = Object.freeze({
      version: VERSION,
      runSafePass,
      hideFloatingLegacyButtons
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
