(() => {
  "use strict";

  const VERSION = "v31.1-direct";
  const SCRIPT_ID = "avatarCarouselBundleDirectV311";
  const ROOT_CLASS = "avatar-carousel-direct-v311";

  function log(...args) {
    console.log("[avatar-carousel-v31.1]", ...args);
  }

  function removeOldIframe() {
    const oldFrame = document.getElementById("avatarCarouselFrameV31");
    if (oldFrame) {
      oldFrame.remove();
      log("removed iframe mount from v31");
    }
  }

  function clearMount(mountEl) {
    if (!mountEl) return;
    [...mountEl.children].forEach((child) => child.remove());
  }

  function buildCarouselDom(mountEl) {
    clearMount(mountEl);

    mountEl.dataset.avatarCarouselMount = VERSION;

    const root = document.createElement("div");
    root.className = ROOT_CLASS;
    root.style.height = "100%";
    root.style.width = "100%";
    root.style.display = "grid";
    root.style.gridTemplateRows = "auto 1fr";
    root.style.gap = "16px";
    root.style.padding = "22px";
    root.style.background = "radial-gradient(circle at 18% 0%, rgba(255,79,160,.16), transparent 30%), radial-gradient(circle at 92% 16%, rgba(139,108,255,.14), transparent 28%), #080712";
    root.style.color = "#fff5fb";

    root.innerHTML = `
      <header class="avatar-v311-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;min-height:58px;">
        <div>
          <h1 style="margin:0;font-size:32px;line-height:1.05;letter-spacing:-.04em;">Avatar</h1>
          <p style="margin:8px 0 0;color:#cabdd8;font-size:16px;">Escolha o personagem. O foco é o VRM grande; as setas ficam embaixo.</p>
        </div>
        <div style="max-width:48%;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div id="statusPill" class="pill warn" style="border:1px solid rgba(255,209,102,.34);background:rgba(255,255,255,.06);color:#ffd166;border-radius:999px;padding:8px 12px;font-weight:800;font-size:13px;">Inicializando preview...</div>
          <div id="countPill" class="pill" style="border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#cabdd8;border-radius:999px;padding:8px 12px;font-weight:800;font-size:13px;">Avatares: verificando</div>
        </div>
      </header>

      <main class="avatar-v311-main" style="min-height:0;display:grid;grid-template-columns:minmax(520px,1fr) minmax(310px,410px);gap:18px;">
        <section class="stage-card" aria-label="Preview 3D do avatar" style="min-height:0;border:1px solid rgba(255,78,145,.30);border-radius:24px;background:linear-gradient(180deg,rgba(19,15,32,.96),rgba(9,8,18,.96));box-shadow:0 22px 70px rgba(0,0,0,.34);overflow:hidden;display:grid;grid-template-rows:1fr auto;">
          <div class="stage" style="position:relative;min-height:0;background:radial-gradient(circle at 50% 28%,rgba(255,255,255,.12),transparent 20%),linear-gradient(180deg,rgba(255,79,160,.04),rgba(139,108,255,.04));">
            <canvas id="avatarCanvas" style="display:block;width:100%;height:100%;min-height:520px;"></canvas>
            <div id="loading" class="loading" style="position:absolute;inset:0;display:grid;place-items:center;padding:28px;text-align:center;color:#cabdd8;pointer-events:none;">
              <div><strong style="color:#fff5fb;font-size:20px;display:block;margin-bottom:8px;">Carregando avatar...</strong><span>Aguarde enquanto o VRM é preparado.</span></div>
            </div>
          </div>

          <div class="nav" style="border-top:1px solid rgba(255,255,255,.10);display:grid;grid-template-columns:74px 1fr 74px;gap:12px;align-items:center;padding:14px 18px 18px;background:rgba(0,0,0,.18);">
            <button id="prevAvatar" class="arrow" type="button" title="Avatar anterior" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.08);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:30px;line-height:1;">‹</button>
            <div class="namebox" style="min-width:0;text-align:center;">
              <div id="avatarName" class="avatar-name" style="font-weight:950;font-size:26px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Nenhum avatar</div>
              <div id="avatarFile" class="avatar-file" style="color:#8e829e;font-size:12px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">src/assets</div>
            </div>
            <button id="nextAvatar" class="arrow" type="button" title="Próximo avatar" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.08);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:30px;line-height:1;">›</button>
          </div>
        </section>

        <aside class="options-card" aria-label="Opções do avatar" style="min-height:0;border:1px solid rgba(255,78,145,.30);border-radius:24px;background:linear-gradient(180deg,rgba(19,15,32,.96),rgba(9,8,18,.96));box-shadow:0 22px 70px rgba(0,0,0,.34);overflow:auto;padding:22px;">
          <h2 style="margin:0 0 18px;font-size:30px;letter-spacing:-.035em;">Opções</h2>

          <label for="avatarSelect" style="display:block;color:#cabdd8;font-weight:850;margin:18px 0 8px;">Personagem</label>
          <select id="avatarSelect" style="width:100%;min-height:58px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:#211f2f;color:#fff5fb;padding:0 14px;font-size:16px;outline:none;"></select>

          <label style="display:block;color:#cabdd8;font-weight:850;margin:18px 0 8px;">Usar avatar em</label>
          <div class="buttons" style="display:grid;gap:12px;margin-top:12px;">
            <button id="openRoom" class="btn primary" type="button" style="border:0;color:#fff5fb;background:linear-gradient(135deg,#ff4fa0,#8b6cff);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Room / Quarto</button>
            <button id="openWidget" class="btn secondary" type="button" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.07);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Widget Mode</button>
            <button id="openPreview" class="btn secondary" type="button" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.07);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Preview / Teste</button>
          </div>

          <label style="display:block;color:#cabdd8;font-weight:850;margin:18px 0 8px;">Ações</label>
          <div class="buttons" style="display:grid;gap:12px;margin-top:12px;">
            <button id="saveDefault" class="btn secondary" type="button" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.07);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Salvar avatar padrão</button>
            <div class="small-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
              <button id="resetCamera" class="btn secondary" type="button" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.07);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Reset câmera</button>
              <button id="toggleSpin" class="btn secondary" type="button" style="border:1px solid rgba(255,255,255,.14);color:#fff5fb;background:rgba(255,255,255,.07);border-radius:18px;min-height:54px;font-weight:900;cursor:pointer;font-size:16px;padding:0 16px;">Girar</button>
            </div>
          </div>

          <div class="note" style="margin-top:18px;color:#8e829e;font-size:13px;line-height:1.5;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;background:rgba(255,255,255,.04);">Esta tela é só o seletor visual limpo. Room, Widget e Preview ficam separados.</div>
          <div id="errorBox" class="error-box" style="margin-top:14px;border:1px solid rgba(255,107,123,.28);color:#ffd9df;background:rgba(255,107,123,.08);padding:12px;border-radius:14px;white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;font-size:12px;display:none;"></div>
        </aside>
      </main>
    `;

    mountEl.appendChild(root);
    return root;
  }

  function loadBundle() {
    if (document.getElementById(SCRIPT_ID)) {
      log("bundle already present");
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "./renderer_dist/avatar_carousel_v19_7_6.bundle.js";

    script.onload = () => {
      window.__YORU_AVATAR_CAROUSEL_DIRECT_V31_1_ACTIVE__ = true;
      log("bundle loaded in main DOM");
    };

    script.onerror = () => {
      const box = document.getElementById("errorBox");
      if (box) {
        box.style.display = "block";
        box.textContent = "Falha ao carregar renderer_dist/avatar_carousel_v19_7_6.bundle.js";
      }
      log("bundle load failed");
    };

    document.body.appendChild(script);
  }

  function watchdog() {
    window.setTimeout(() => {
      const loading = document.getElementById("loading");
      const status = document.getElementById("statusPill");
      const box = document.getElementById("errorBox");

      const stillLoading = loading && getComputedStyle(loading).display !== "none";

      if (stillLoading && box) {
        box.style.display = "block";
        box.textContent =
          "Preview ainda carregando depois de 15s. Verifique se existe pelo menos um .vrm em src/assets ou src/assets/avatars e se o bundle renderer_dist/avatar_carousel_v19_7_6.bundle.js foi gerado.";
      }

      if (stillLoading && status) {
        status.textContent = "preview demorando";
        status.className = "pill bad";
      }
    }, 15000);
  }

  async function mount(mountEl) {
    if (!mountEl) return;

    removeOldIframe();
    buildCarouselDom(mountEl);
    loadBundle();
    watchdog();

    console.log("[avatar-carousel-v31.1] direct DOM mounted");
  }

  window.AvatarCarouselMountV31 = { mount };
})();