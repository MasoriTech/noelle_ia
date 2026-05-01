"use strict";

/*
  Noelle/Yoru V19.8.28 — Status/Assets module
  Segunda quebra segura do controls_window_app.js.
  Escopo:
  - refreshStatus
  - loadAssets
  Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.
*/

(() => {
  async function refreshStatus(deps = {}, options = {}) {
    const {
      appState,
      setGlobalStatus,
      setChatStatus,
      updateAssetSummary,
      showToast
    } = deps;

    const quiet = !!options.quiet;

    if (!window.noelleAPI?.status) {
      setGlobalStatus?.("API indisponível", "bad");
      setChatStatus?.("IA indisponível", "preload não carregou");
      return null;
    }

    try {
      const status = await window.noelleAPI.status();
      const online = !!status?.ollama?.ok;
      const counts = status?.assets?.counts || {};

      setGlobalStatus?.(online ? "Ollama online" : "Ollama offline", online ? "ok" : "bad");
      setChatStatus?.(
        online ? `IA online · ${appState?.profile || "rapido"}` : "IA offline",
        online ? "Pronto." : "Abra o Ollama em 127.0.0.1:11434"
      );

      updateAssetSummary?.(counts);

      if (!quiet) {
        showToast?.(
          online
            ? `Ollama online. Assets: ${counts.expressions || 0} expressões, ${counts.motions || 0} motions.`
            : status?.ollama?.error || "Ollama offline."
        );
      }

      return status;
    } catch (err) {
      setGlobalStatus?.("Erro no status", "bad");
      setChatStatus?.("Erro", String(err?.message || err));
      if (!quiet) showToast?.("Erro ao consultar status.");
      return null;
    }
  }

  async function loadAssets(deps = {}) {
    const {
      appState,
      renderAssets,
      updateAssetSummary,
      showToast
    } = deps;

    if (!window.noelleAPI?.assets) return null;

    try {
      const result = await window.noelleAPI.assets();

      if (result?.ok) {
        if (appState) appState.assets = result.assets;

        renderAssets?.(result.assets);
        updateAssetSummary?.(result.assets?.counts || {});

        const noelle = result.assets?.avatars?.[0];
        const label = document.querySelector("#avatarPathLabel");
        if (label) label.textContent = noelle?.rel || "Nenhum VRM encontrado em src/assets.";

        return result;
      }

      return result || null;
    } catch (err) {
      console.warn("Falha ao carregar assets:", err);
      showToast?.("Falha ao carregar assets.");
      return null;
    }
  }

  window.NoelleStatusAssetsV19828 = Object.freeze({
    version: "19.8.28-status-assets-split-2026",
    refreshStatus,
    loadAssets
  });
})();
