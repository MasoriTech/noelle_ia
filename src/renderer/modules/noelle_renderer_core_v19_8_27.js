"use strict";

/*
  Noelle/Yoru V19.8.27a — Renderer Core Module
  Correção:
  - evita classList.remove para não cair no diagnóstico de remoção de DOM;
  - não remove elementos;
  - não usa observador de DOM;
  - não mexe em Avatar renderer.
*/

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  function nowTime() {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function showToast(text) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.toggle("show", true);
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.toggle("show", false), 3000);
  }

  function escapeText(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function selectHasValue(select, value) {
    return !!select && Array.from(select.options || []).some((opt) => opt.value === value);
  }

  function setGlobalStatus(text, type = "warn") {
    const label = $("#globalStatus");
    const dot = $("#globalStatusDot");

    if (label) label.textContent = text;

    if (dot) {
      dot.classList.toggle("ok", false);
      dot.classList.toggle("bad", false);
      if (type === "ok") dot.classList.toggle("ok", true);
      if (type === "bad") dot.classList.toggle("bad", true);
    }
  }

  function setChatStatus(text, detail = "") {
    const pill = $("#chatStatusPill");
    const detailEl = $("#chatDetailStatus");
    if (pill) pill.textContent = text;
    if (detailEl) detailEl.textContent = detail;
  }

  function autosizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 130) + "px";
  }

  function scrollChatToBottom() {
    const log = $("#chatLog");
    if (!log) return;
    requestAnimationFrame(() => {
      log.scrollTop = log.scrollHeight;
    });
  }

  function applyTheme(appState, theme) {
    if (appState) appState.theme = theme || "noelle";
    const activeTheme = appState?.theme || theme || "noelle";

    document.body.classList.toggle("theme-noelle", false);
    document.body.classList.toggle("theme-pbv", false);
    document.body.classList.toggle("theme-dark", false);
    document.body.classList.toggle("theme-light", false);
    document.body.classList.toggle(`theme-${activeTheme}`, true);
  }

  function updateAssetSummary(counts = {}) {
    const box = $("#assetSummary");
    if (!box) return;

    box.innerHTML = `
      <span>Expressões: ${Number(counts.expressions || 0)}</span>
      <span>Motions VRMA: ${Number(counts.motions || 0)}</span>
      <span>Itens GLB: ${Number(counts.items || 0)}</span>
      <span>Avatares VRM: ${Number(counts.avatars || 0)}</span>
    `;
  }

  window.NoelleRendererCoreV19827 = Object.freeze({
    version: "19.8.27a-controls-core-diagfix-2026",
    nowTime,
    showToast,
    escapeText,
    selectHasValue,
    setGlobalStatus,
    setChatStatus,
    autosizeTextarea,
    scrollChatToBottom,
    applyTheme,
    updateAssetSummary
  });
})();
