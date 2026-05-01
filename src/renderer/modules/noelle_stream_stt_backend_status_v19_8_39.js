(() => {
  "use strict";

  const VERSION = "19.8.39-stt-status-existing-only-2026";

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function getStreamPage() {
    return $('.page[data-page="stream"]') || $("#streamPageV19829") || document.body || document;
  }

  function setStatus(message, kind = "info") {
    const el = $("#streamSTTBackendStatusV19839");
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }

  function renderCommands(status) {
    const box = $("#streamSTTBackendListV19839");
    if (!box) return;

    const commands = Array.isArray(status?.commands) ? status.commands : [];

    if (!commands.length) {
      box.textContent = "Nenhum backend STT configurado.";
      return;
    }

    box.innerHTML = commands.map((cmd) => {
      const exists = cmd.exists ? "OK" : "NÃO ENCONTRADO";
      return `<div style="font-size:12px;line-height:1.35;margin-top:4px;">
        <strong>${escapeHtml(cmd.name || cmd.command)}</strong> — ${escapeHtml(exists)}<br>
        <span style="opacity:.65;">${escapeHtml(cmd.command || "")}</span>
      </div>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  async function checkStatus() {
    const bridge = window.noelleStreamBridgeV19839 || window.noelleStreamBridgeV19838 || window.noelleStreamBridge;
    if (!bridge || typeof bridge.sttStatus !== "function") {
      setStatus("Bridge STT indisponível. Reinicie o app após aplicar o pack.", "error");
      renderCommands({ commands: [] });
      return null;
    }

    try {
      setStatus("Verificando STT...", "info");
      const status = await bridge.sttStatus();

      if (status?.configured) {
        setStatus("STT configurado.", "ok");
      } else {
        setStatus(status?.message || "STT não configurado. Rode CONFIGURAR_STT.bat.", "warn");
      }

      renderCommands(status);
      return status;
    } catch (err) {
      setStatus("Falha ao verificar STT: " + (err?.message || err), "error");
      return null;
    }
  }

  function ensurePanel() {
    const page = getStreamPage();
    if (!page || $("#streamSTTBackendPanelV19839")) return;

    const anchor =
      $("#streamPipelinePanelV19838") ||
      $("#streamHistoryPanelV19836") ||
      $("#streamTTSPanelV19835") ||
      $("#streamAIReplyPanel") ||
      $("#streamLog")?.closest?.("section, .card, div") ||
      page;

    const panel = document.createElement("section");
    panel.id = "streamSTTBackendPanelV19839";
    panel.setAttribute("data-noelle-stream-stt-backend", VERSION);
    panel.style.marginTop = "14px";
    panel.style.padding = "14px";
    panel.style.border = "1px solid rgba(255,255,255,.10)";
    panel.style.borderRadius = "14px";
    panel.style.background = "rgba(255,255,255,.035)";

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <strong style="display:block;font-size:15px;">Backend STT</strong>
          <span id="streamSTTBackendStatusV19839" data-kind="info" style="font-size:12px;opacity:.72;">
            Verificando...
          </span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="streamCheckSTTBackendBtnV19839" type="button">Verificar STT</button>
        </div>
      </div>
      <div id="streamSTTBackendListV19839" style="margin-top:10px;font-size:12px;opacity:.84;"></div>
      <p style="margin:10px 0 0;font-size:12px;opacity:.66;">
        Se aparecer não configurado, rode CONFIGURAR_STT.bat na pasta do projeto.
      </p>
    `;

    if (anchor === page) page.appendChild(panel);
    else anchor.insertAdjacentElement("afterend", panel);
  }

  function bind() {
    if (document.__streamSTTBackendV19839Bound) return;
    document.__streamSTTBackendV19839Bound = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.id === "streamCheckSTTBackendBtnV19839") checkStatus();
    }, true);
  }

  function patchPipelineBridgePreference() {
    try {
      if (window.noelleStreamBridgeV19839 && !window.noelleStreamBridge) {
        window.noelleStreamBridge = window.noelleStreamBridgeV19839;
      }
    } catch {}
  }

  function boot() {
    ensurePanel();
    bind();
    patchPipelineBridgePreference();
    setTimeout(checkStatus, 500);

    window.NoelleStreamSTTBackendV19839 = Object.freeze({
      version: VERSION,
      checkStatus
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
