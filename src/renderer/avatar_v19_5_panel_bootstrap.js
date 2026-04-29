(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_5_AVATAR_REAL_VRM_SYNC_ANIM_2026";
  const STYLE_ID = "noelle-v19-5-avatar-panel-style";
  const PANEL_ATTR = "data-noelle-v19-5-avatar-panel";
  const BUNDLE_ID = "noelle-v19-5-avatar-bundle";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --av195-card: rgba(14, 14, 25, .96);
        --av195-line: rgba(255, 83, 136, .30);
        --av195-text: #fff4fb;
        --av195-muted: #cbbbd4;
        --av195-accent: #ff477e;
        --av195-accent2: #8b5cf6;
        --av195-ok: #42f5ad;
        --av195-warn: #ffd166;
        --av195-danger: #ff6b6b;
      }
      .av195-root { width: min(100%, 1180px); margin: 18px 0; }
      .av195-grid { display: grid; grid-template-columns: minmax(340px, 1.15fr) minmax(300px, .85fr); gap: 14px; align-items: stretch; }
      @media (max-width: 980px) { .av195-grid { grid-template-columns: 1fr; } }
      .av195-card {
        border: 1px solid var(--av195-line);
        background: var(--av195-card);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 16px 42px rgba(0,0,0,.20);
      }
      .av195-card h3 { margin: 0 0 10px; color: var(--av195-text); font-size: 18px; }
      .av195-card p, .av195-card li, .av195-card span, .av195-card label { color: var(--av195-muted); line-height: 1.45; }
      .av195-preview-wrap {
        position: relative;
        min-height: 420px;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.10);
        background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.12), transparent 24%), #11111d;
      }
      .av195-canvas { width: 100%; height: 420px; display: block; }
      .av195-status {
        position: absolute;
        left: 12px;
        top: 12px;
        right: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        pointer-events: none;
      }
      .av195-pill {
        display: inline-flex;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 999px;
        padding: 5px 9px;
        color: var(--av195-muted);
        background: rgba(0,0,0,.28);
        backdrop-filter: blur(8px);
      }
      .av195-pill.ok { color: var(--av195-ok); border-color: rgba(66,245,173,.35); }
      .av195-pill.warn { color: var(--av195-warn); border-color: rgba(255,209,102,.35); }
      .av195-pill.danger { color: var(--av195-danger); border-color: rgba(255,107,107,.35); }
      .av195-controls { display: grid; gap: 12px; }
      .av195-row { display: grid; gap: 7px; }
      .av195-row select, .av195-row input {
        color-scheme: dark !important;
        background: #211f2d !important;
        color: #fff4fb !important;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 12px;
        padding: 9px 10px;
      }
      .av195-actions { display: flex; gap: 9px; flex-wrap: wrap; }
      .av195-btn {
        border: 1px solid rgba(255,255,255,.14);
        color: var(--av195-text);
        background: rgba(255,255,255,.08);
        border-radius: 13px;
        padding: 9px 12px;
        font-weight: 850;
        cursor: pointer;
      }
      .av195-btn.primary { background: linear-gradient(135deg, var(--av195-accent), var(--av195-accent2)); }
      .av195-kbd { display: inline-block; border-radius: 8px; background: rgba(255,255,255,.09); color: var(--av195-text); padding: 2px 7px; font-family: ui-monospace, Consolas, monospace; word-break: break-all; }
      .av195-debug { max-height: 170px; overflow: auto; font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: var(--av195-muted); background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px; white-space: pre-wrap; }
    `;
    document.head.appendChild(style);
  }

  function allText() {
    return String(document.body?.innerText || "");
  }

  function isAvatarPage() {
    const text = allText();
    return /\bAvatar\b/i.test(text) && (/Avatar da Noelle/i.test(text) || /Widget VRM/i.test(text) || /Controles do widget/i.test(text));
  }

  function findHost() {
    const headers = Array.from(document.querySelectorAll("h1, h2, h3"));
    const avatarHeader = headers.find((h) => /^Avatar$/i.test(String(h.textContent || "").trim()) || /Avatar da Noelle/i.test(String(h.textContent || "")));
    if (avatarHeader) {
      const candidates = [
        avatarHeader.closest("main"),
        avatarHeader.closest("section"),
        avatarHeader.parentElement?.parentElement,
        avatarHeader.parentElement
      ].filter(Boolean);
      for (const candidate of candidates) if (candidate && candidate !== document.body && candidate.querySelector) return candidate;
    }
    const likely = Array.from(document.querySelectorAll("main, [class*='content'], [class*='page'], section"))
      .filter((el) => el.offsetWidth > 450 && el.offsetHeight > 250)
      .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
    return likely || document.body;
  }

  function removeOldPanels() {
    const selectors = [
      "[data-noelle-v19-4-avatar-panel]",
      "[data-noelle-v19-4-1-avatar-panel]",
      "[data-noelle-v19-5-avatar-panel]"
    ];
    for (const el of Array.from(document.querySelectorAll(selectors.join(",")))) {
      if (el.getAttribute(PANEL_ATTR) !== "avatar") el.remove();
    }
  }

  function loadBundle() {
    return new Promise((resolve, reject) => {
      if (window.NoelleAvatarV195?.mount) return resolve(window.NoelleAvatarV195);
      let script = document.getElementById(BUNDLE_ID);
      if (!script) {
        script = document.createElement("script");
        script.id = BUNDLE_ID;
        script.src = "./renderer_dist/avatar_v19_5.bundle.js";
        script.defer = true;
        script.onload = () => resolve(window.NoelleAvatarV195);
        script.onerror = () => reject(new Error("Bundle avatar_v19_5.bundle.js não carregou"));
        document.head.appendChild(script);
        return;
      }
      script.addEventListener("load", () => resolve(window.NoelleAvatarV195), { once: true });
      script.addEventListener("error", () => reject(new Error("Bundle avatar_v19_5.bundle.js não carregou")), { once: true });
    });
  }

  function setText(root, selector, text) {
    const el = root.querySelector(selector);
    if (el) el.textContent = text;
  }

  async function mountPreview(root) {
    if (root.dataset.mountedPreview === "1") return;
    root.dataset.mountedPreview = "1";

    try {
      const api = await loadBundle();
      if (!api?.mount) throw new Error("NoelleAvatarV195.mount ausente");
      await api.mount({
        root,
        canvas: root.querySelector("[data-av195-canvas]"),
        statusEl: root.querySelector("[data-av195-status]"),
        debugEl: root.querySelector("[data-av195-debug]"),
        avatarSelect: root.querySelector("[data-av195-avatar]"),
        motionSelect: root.querySelector("[data-av195-motion]")
      });
    } catch (err) {
      console.error("[Noelle V19.5] Preview falhou:", err);
      setText(root, "[data-av195-status-text]", "Preview indisponível. Rode o build V19.5.");
      const debug = root.querySelector("[data-av195-debug]");
      if (debug) debug.textContent = String(err?.stack || err?.message || err);
    }
  }

  function ensureAvatarPanel() {
    removeOldPanels();
    if (document.querySelector(`[${PANEL_ATTR}="avatar"]`)) return;

    const host = findHost();
    const root = document.createElement("section");
    root.className = "av195-root";
    root.setAttribute(PANEL_ATTR, "avatar");

    root.innerHTML = `
      <div class="av195-grid">
        <article class="av195-card">
          <h3>Preview real do VRM V19.5</h3>
          <p>Carrega Noelle/Yoru com Three.js + @pixiv/three-vrm. Também envia estado para a Room via BroadcastChannel/localStorage.</p>
          <div class="av195-preview-wrap">
            <canvas class="av195-canvas" data-av195-canvas></canvas>
            <div class="av195-status" data-av195-status>
              <span class="av195-pill warn" data-av195-status-text>Preparando preview...</span>
            </div>
          </div>
        </article>

        <article class="av195-card">
          <h3>Avatar, Room e animações</h3>
          <div class="av195-controls">
            <div class="av195-row">
              <label>Avatar</label>
              <select data-av195-avatar>
                <option value="./assets/Noelle.vrm">Noelle principal</option>
                <option value="./assets/avatars/Yoru.vrm">Yoru Room</option>
                <option value="./assets/avatars/Noelle.vrm">Noelle em avatars</option>
              </select>
            </div>
            <div class="av195-row">
              <label>Motion VRMA</label>
              <select data-av195-motion>
                <option value="">Sem motion / idle simples</option>
              </select>
            </div>
            <div class="av195-actions">
              <button class="av195-btn primary" data-av195-action="load">Carregar VRM</button>
              <button class="av195-btn" data-av195-action="idle">Idle</button>
              <button class="av195-btn" data-av195-action="blink">Blink</button>
              <button class="av195-btn" data-av195-action="happy">Happy</button>
              <button class="av195-btn" data-av195-action="neutral">Neutral</button>
              <button class="av195-btn" data-av195-action="play-motion">Tocar VRMA</button>
              <button class="av195-btn" data-av195-action="stop-motion">Parar motion</button>
              <button class="av195-btn" data-av195-action="sync-room">Sincronizar Room</button>
              <button class="av195-btn" data-av195-action="copy-report">Copiar relatório</button>
            </div>
            <p><span class="av195-kbd">BroadcastChannel</span> noelle-avatar-room-sync · <span class="av195-kbd">localStorage</span> noelle.avatar.sync.state</p>
            <pre class="av195-debug" data-av195-debug>Inicializando...</pre>
          </div>
        </article>
      </div>
    `;

    host.appendChild(root);
    mountPreview(root);
  }

  function cleanupWhenNotAvatar() {
    if (!isAvatarPage()) {
      for (const el of Array.from(document.querySelectorAll(`[${PANEL_ATTR}="avatar"]`))) {
        try { window.NoelleAvatarV195?.unmount?.(el); } catch {}
        el.remove();
      }
    }
  }

  function tick() {
    injectStyle();
    cleanupWhenNotAvatar();
    if (isAvatarPage()) ensureAvatarPanel();
  }

  function start() {
    if (window.__NOELLE_V19_5_AVATAR_PANEL_STARTED__) return;
    window.__NOELLE_V19_5_AVATAR_PANEL_STARTED__ = true;
    tick();

    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(tick, 90);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setInterval(tick, 1800);
    console.log("[Noelle V19.5] Avatar Real VRM panel ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__NOELLE_V19_5_AVATAR_PANEL__ = PATCH_ID;
})();