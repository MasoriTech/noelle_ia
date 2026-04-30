/*
  Noelle/Yoru V19.8.17 — Avatar canvas background guard
  Guard limitado: só escurece pais do canvas do avatar quando a tela contém a frase do preview.
  Não cria painel, não remove DOM, não usa loop infinito.
*/
(() => {
  "use strict";

  const VERSION = "19.8.17-avatar-targeted-apose-darkbg-2026";

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").toLowerCase();
  }

  function isAvatarPreviewPage() {
    const t = textOf(document.body);
    return t.includes("arraste para girar") || t.includes("use scroll para zoom") || t.includes("avatar carregado");
  }

  function darkenCanvasParents() {
    if (!isAvatarPreviewPage()) return;

    document.body.classList.add("noelle-avatar-v19817-active");

    const canvases = Array.from(document.querySelectorAll("canvas")).filter((canvas) => {
      const r = canvas.getBoundingClientRect();
      return r.width >= 160 && r.height >= 160;
    });

    for (const canvas of canvases) {
      canvas.style.setProperty("background", "#080706", "important");
      canvas.style.setProperty("background-color", "#080706", "important");

      let el = canvas.parentElement;
      let steps = 0;
      while (el && steps < 7 && el !== document.body) {
        const rect = el.getBoundingClientRect();
        if (rect.width >= canvas.getBoundingClientRect().width - 10 && rect.height >= canvas.getBoundingClientRect().height - 10) {
          el.setAttribute("data-noelle-avatar-v19817-stage", "true");
          el.style.setProperty("background", "linear-gradient(135deg, #080706, #15100c)", "important");
          el.style.setProperty("background-color", "#080706", "important");
          el.style.setProperty("background-image", "radial-gradient(circle at 50% 35%, rgba(255,122,26,.14), transparent 36%), linear-gradient(135deg, #080706, #15100c)", "important");
        }
        el = el.parentElement;
        steps += 1;
      }
    }
  }

  function boot() {
    darkenCanvasParents();
    [120, 350, 800, 1600].forEach((ms) => setTimeout(darkenCanvasParents, ms));
    window.addEventListener("resize", darkenCanvasParents, { passive: true });
    document.addEventListener("click", () => setTimeout(darkenCanvasParents, 80), true);

    window.noelleAvatarTargetV19817 = Object.freeze({
      version: VERSION,
      darkenCanvasParents
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
