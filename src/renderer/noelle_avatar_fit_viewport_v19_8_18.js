/*
  Noelle/Yoru V19.8.18 — Avatar fit viewport guard
  Guard pequeno: só marca a aba Avatar e ajusta altura disponível.
  Não remove DOM. Não cria painel. Não usa MutationObserver.
*/
(() => {
  "use strict";

  const VERSION = "19.8.18-avatar-fit-viewport-2026";

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").toLowerCase();
  }

  function isAvatarPage() {
    const t = textOf(document.body);
    return (
      t.includes("arraste para girar") ||
      t.includes("use scroll para zoom") ||
      t.includes("avatar carregado") ||
      (t.includes("room / quarto") && t.includes("widget mode") && t.includes("preview / teste"))
    );
  }

  function rectOk(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 80 && r.height > 80;
  }

  function findTopHeaderOffset() {
    const candidates = Array.from(document.querySelectorAll("header, .topbar, .app-header, [class*='header'], [class*='top']"))
      .filter(rectOk)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.top <= 80 && r.height >= 30 && r.height <= 140)
      .sort((a, b) => b.bottom - a.bottom);

    if (candidates[0]) return Math.max(0, Math.round(candidates[0].bottom));

    // fallback pelo título da página
    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).filter((h) => /avatar/i.test(h.textContent || "") && rectOk(h));
    if (headings[0]) return Math.max(0, Math.round(headings[0].getBoundingClientRect().bottom + 16));

    return 135;
  }

  function findAvatarCanvas() {
    const canvases = Array.from(document.querySelectorAll("canvas")).filter((canvas) => {
      const r = canvas.getBoundingClientRect();
      return r.width >= 220 && r.height >= 180;
    });
    return canvases.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    })[0] || null;
  }

  function climb(el, steps) {
    let cur = el;
    for (let i = 0; i < steps && cur && cur.parentElement && cur.parentElement !== document.body; i++) {
      cur = cur.parentElement;
    }
    return cur;
  }

  function findSidePanel(canvas) {
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll("section, aside, article, div"))
      .filter(rectOk)
      .filter((el) => {
        const t = textOf(el);
        if (!(t.includes("room / quarto") || t.includes("widget mode") || t.includes("preview / teste"))) return false;
        const r = el.getBoundingClientRect();
        return r.left > canvasRect.left + canvasRect.width * 0.45;
      })
      .sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return (rb.width * rb.height) - (ra.width * ra.height);
      });
    return candidates[0] || null;
  }

  function findAvatarPageRoot(canvas, sidePanel) {
    const candidates = [];

    if (canvas) {
      let cur = canvas.parentElement;
      for (let i = 0; i < 10 && cur && cur !== document.body; i++, cur = cur.parentElement) {
        if (rectOk(cur)) candidates.push(cur);
      }
    }

    if (sidePanel) {
      let cur = sidePanel.parentElement;
      for (let i = 0; i < 8 && cur && cur !== document.body; i++, cur = cur.parentElement) {
        if (rectOk(cur)) candidates.push(cur);
      }
    }

    const scored = candidates.map((el) => {
      const r = el.getBoundingClientRect();
      const t = textOf(el);
      let score = 0;
      if (t.includes("room / quarto")) score += 20;
      if (t.includes("widget mode")) score += 20;
      if (t.includes("preview / teste")) score += 20;
      if (t.includes("arraste para girar")) score += 20;
      if (r.width > window.innerWidth * 0.45) score += 10;
      if (r.height > window.innerHeight * 0.35) score += 10;
      if (r.top > 80) score += 5;
      return { el, score, area: r.width * r.height };
    }).sort((a, b) => b.score - a.score || b.area - a.area);

    return scored[0]?.el || null;
  }

  function findNav(canvas) {
    if (!canvas) return null;
    const root = climb(canvas, 4);
    const candidates = Array.from((root || document).querySelectorAll("button, div, section"))
      .filter(rectOk)
      .filter((el) => {
        const t = textOf(el);
        return t.includes("←") || t.includes("→") || t.includes("1 /") || t.includes("2 /") || t.includes("3 /");
      })
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
    return candidates[0]?.parentElement || candidates[0] || null;
  }

  function applyFit() {
    const active = isAvatarPage();
    document.body.classList.toggle("noelle-avatar-fit-v19818", active);
    if (!active) return;

    const top = findTopHeaderOffset();
    document.documentElement.style.setProperty("--noelle-avatar-top-offset-v19818", `${top}px`);
    document.documentElement.style.setProperty("--noelle-avatar-stage-reserve-v19818", `${top + 165}px`);
    document.documentElement.style.setProperty("--noelle-avatar-stage-reserve-low-v19818", `${top + 142}px`);
    document.documentElement.style.setProperty("--noelle-avatar-stage-reserve-tiny-v19818", `${top + 126}px`);

    const canvas = findAvatarCanvas();
    if (!canvas) return;

    const stage = canvas.parentElement;
    if (stage) {
      stage.classList.add("noelle-avatar-stage-v19818");
      stage.style.setProperty("overflow", "hidden", "important");
    }

    const stageCard = climb(canvas, 2);
    if (stageCard) stageCard.classList.add("noelle-avatar-stage-card-v19818");

    const side = findSidePanel(canvas);
    if (side) side.classList.add("noelle-avatar-side-v19818");

    const page = findAvatarPageRoot(canvas, side);
    if (page) page.classList.add("noelle-avatar-page-v19818");

    const main = page?.parentElement;
    if (main && main !== document.body) main.classList.add("noelle-avatar-main-v19818");

    const nav = findNav(canvas);
    if (nav) nav.classList.add("noelle-avatar-nav-v19818");

    // Ajuste direto do canvas. O renderer geralmente acompanha resize pelo app,
    // mas isto evita o card visual estourar a viewport.
    const stageRect = stage?.getBoundingClientRect?.();
    if (stageRect && stageRect.height > 0) {
      canvas.style.setProperty("max-height", "100%", "important");
      canvas.style.setProperty("height", "100%", "important");
    }
  }

  function boot() {
    applyFit();
    [80, 220, 500, 1000, 1800].forEach((ms) => setTimeout(applyFit, ms));
    window.addEventListener("resize", applyFit, { passive: true });
    document.addEventListener("click", () => setTimeout(applyFit, 80), true);

    window.noelleAvatarFitV19818 = Object.freeze({
      version: VERSION,
      applyFit
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
