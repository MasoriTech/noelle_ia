(() => {
  "use strict";

  const VERSION = "v31.3-simple-direct";
  const SCRIPT_ID = "avatarCarouselBundleDirectV313";
  const BRIDGE_ID = "avatarAssetsBridgeV312Script";

  function log(...args) {
    console.log("[avatar-carousel-v31.3]", ...args);
  }

  function clearMount(mountEl) {
    if (!mountEl) return;
    [...mountEl.children].forEach((child) => child.remove());
  }

  function hiddenButton(id) {
    return `<button id="${id}" type="button" style="display:none;"></button>`;
  }

  function buildDom(mountEl) {
    clearMount(mountEl);

    mountEl.dataset.avatarCarouselMount = VERSION;

    const root = document.createElement("div");
    root.id = "avatarCarouselSimpleV313";
    root.style.height = "100%";
    root.style.width = "100%";
    root.style.display = "grid";
    root.style.gridTemplateRows = "auto 1fr auto";
    root.style.gap = "0";
    root.style.background = "radial-gradient(circle at 50% 16%, rgba(255,255,255,.10), transparent 24%), radial-gradient(circle at 18% 0%, rgba(255,79,160,.14), transparent 30%), radial-gradient(circle at 92% 16%, rgba(139,108,255,.14), transparent 28%), #080712";
    root.style.color = "#fff5fb";
    root.style.boxSizing = "border-box";

    root.innerHTML = `
      <header style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.16);">
        <div style="min-width:0;">
          <strong style="display:block;font-size:18px;line-height:1.1;">Seletor de personagem</strong>
          <span style="display:block;color:#cabdd8;font-size:13px;margin-top:3px;">Use as setas embaixo para trocar o VRM.</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <div id="statusPill" style="border:1px solid rgba(255,209,102,.34);background:rgba(255,255,255,.06);color:#ffd166;border-radius:999px;padding:7px 11px;font-weight:800;font-size:12px;">Inicializando...</div>
          <div id="countPill" style="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#cabdd8;border-radius:999px;padding:7px 11px;font-weight:800;font-size:12px;">Avatares: verificando</div>
        </div>
      </header>

      <section style="position:relative;min-height:0;">
        <canvas id="avatarCanvas" style="display:block;width:100%;height:100%;min-height:420px;"></canvas>
        <div id="loading" style="position:absolute;inset:0;display:grid;place-items:center;padding:28px;text-align:center;color:#cabdd8;pointer-events:none;">
          <div>
            <strong style="color:#fff5fb;font-size:22px;display:block;margin-bottom:8px;">Carregando avatar...</strong>
            <span>Aguarde enquanto o VRM é preparado.</span>
          </div>
        </div>
      </section>

      <footer style="border-top:1px solid rgba(255,255,255,.10);display:grid;grid-template-columns:90px 1fr 90px;gap:14px;align-items:center;padding:14px 18px;background:rgba(0,0,0,.22);">
        <button id="prevAvatar" type="button" title="Avatar anterior" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.08);border-radius:18px;min-height:58px;font-weight:950;cursor:pointer;font-size:34px;line-height:1;">‹</button>
        <div style="min-width:0;text-align:center;">
          <div id="avatarName" style="font-weight:950;font-size:30px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Nenhum avatar</div>
          <div id="avatarFile" style="color:#8e829e;font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">src/assets</div>
        </div>
        <button id="nextAvatar" type="button" title="Próximo avatar" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.08);border-radius:18px;min-height:58px;font-weight:950;cursor:pointer;font-size:34px;line-height:1;">›</button>
      </footer>

      <div id="avatarHiddenControlsV313" style="display:none;">
        <select id="avatarSelect"></select>
        ${hiddenButton("openRoom")}
        ${hiddenButton("openWidget")}
        ${hiddenButton("openPreview")}
        ${hiddenButton("saveDefault")}
        ${hiddenButton("resetCamera")}
        ${hiddenButton("toggleSpin")}
      </div>

      <div id="errorBox" style="position:absolute;left:18px;right:18px;bottom:92px;border:1px solid rgba(255,107,123,.28);color:#ffd9df;background:rgba(16,9,18,.88);padding:12px;border-radius:14px;white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;font-size:12px;display:none;z-index:20;"></div>
    `;

    mountEl.appendChild(root);
  }

  function loadAssetsBridge() {
    return new Promise((resolve) => {
      if (window.AvatarAssetsBridgeV312 || document.getElementById(BRIDGE_ID)) {
        resolve();
        return;
      }

      const bridge = document.createElement("script");
      bridge.id = BRIDGE_ID;
      bridge.src = "./renderer/modules/avatar/avatar_assets_bridge_v31_2.js";
      bridge.onload = () => resolve();
      bridge.onerror = () => resolve();
      document.body.appendChild(bridge);
    });
  }

  function loadBundle() {
    return new Promise((resolve) => {
      const old = document.getElementById(SCRIPT_ID);
      if (old) old.remove();

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "./renderer_dist/avatar_carousel_v19_7_6.bundle.js";
      script.onload = () => {
        window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_3_ACTIVE__ = true;
        log("bundle loaded");
        resolve(true);
      };
      script.onerror = () => {
        const box = document.getElementById("errorBox");
        if (box) {
          box.style.display = "block";
          box.textContent = "Falha ao carregar renderer_dist/avatar_carousel_v19_7_6.bundle.js";
        }
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  function watchdog() {
    window.setTimeout(() => {
      const list = window.__YORU_AVATAR_LIST_V31_2__ || [];
      const box = document.getElementById("errorBox");
      const loading = document.getElementById("loading");
      const status = document.getElementById("statusPill");

      if (!list.length && box) {
        box.style.display = "block";
        box.textContent = "Nenhum .vrm encontrado. Coloque arquivos .vrm em src/assets/avatars ou src/assets e reinicie.";
      }

      if (list.length) {
        if (status) status.textContent = `avatar pronto (${list.length})`;

        const currentName = document.getElementById("avatarName")?.textContent || "";
        if (loading && !/Nenhum avatar/i.test(currentName)) {
          loading.style.display = "none";
        }
      }
    }, 7000);
  }

  async function mount(mountEl) {
    if (!mountEl) return;

    buildDom(mountEl);
    await loadAssetsBridge();

    try {
      await window.AvatarAssetsBridgeV312?.boot?.();
    } catch {}

    await loadBundle();
    watchdog();

    log("mounted simple carousel");
  }

  window.AvatarCarouselMountV31 = { mount };
})();