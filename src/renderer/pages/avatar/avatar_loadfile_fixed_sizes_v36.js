(() => {
  "use strict";

  const STYLE_ID = "avatarLoadfileFixedSizesV36Style";
  const IFRAME_STYLE_ID = "avatarLoadfileFixedSizesV36IframeStyle";
  const VERSION = "v36";

  function log(...args) {
    console.log("[avatar-fixed-size-v36]", ...args);
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;

    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "./renderer/pages/avatar/avatar_loadfile_fixed_sizes_v36.css";
    document.head.appendChild(link);
  }

  function important(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, "important");
  }

  function tuneOuter() {
    const page = document.querySelector('[data-page="avatar"]');
    const root = document.getElementById("avatarLoadfileWorkingV1983");
    const header = root?.firstElementChild;
    const shell = document.getElementById("avatarLoadfileShellWorking");
    const frame = document.getElementById("avatarLoadfileWorkingFrameV1983");
    const note = document.getElementById("avatarLoadfileNoteWorking");

    important(page, "overflow", "hidden");
    important(page, "padding", window.innerHeight < 780 ? "10px 16px 12px" : "12px 18px 14px");

    if (root) {
      root.dataset.avatarSize = VERSION;
      important(root, "height", window.innerHeight < 780 ? "calc(100vh - 132px)" : "calc(100vh - 150px)");
      important(root, "display", "grid");
      important(root, "grid-template-rows", window.innerHeight < 780 ? "48px minmax(0, 1fr)" : "58px minmax(0, 1fr)");
      important(root, "gap", window.innerHeight < 780 ? "8px" : "10px");
      important(root, "overflow", "hidden");
    }

    if (header) {
      important(header, "height", window.innerHeight < 780 ? "48px" : "58px");
      important(header, "min-height", window.innerHeight < 780 ? "48px" : "58px");
      important(header, "margin", "0");
      important(header, "padding", "0");
      important(header, "align-items", "center");
      important(header, "overflow", "hidden");
    }

    if (shell) {
      important(shell, "height", "100%");
      important(shell, "min-height", "0");
      important(shell, "aspect-ratio", "auto");
      important(shell, "overflow", "hidden");
    }

    if (frame) {
      important(frame, "width", "100%");
      important(frame, "height", "100%");
      important(frame, "min-height", "0");
      tuneIframe(frame);
    }

    if (note) important(note, "display", "none");
  }

  function tuneIframe(frame) {
    let doc = null;

    try {
      doc = frame.contentDocument || frame.contentWindow?.document;
    } catch {
      return;
    }

    if (!doc || doc.getElementById(IFRAME_STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = IFRAME_STYLE_ID;
    style.textContent = `
      html,
      body {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        background: #080810 !important;
      }

      body {
        display: grid !important;
        grid-template-rows: 40px minmax(0, 1fr) !important;
        gap: 0 !important;
      }

      header,
      .header,
      .top,
      .toolbar,
      .app-header {
        height: 40px !important;
        min-height: 40px !important;
        max-height: 40px !important;
        padding: 5px 12px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      h1,
      h2 {
        font-size: 17px !important;
        line-height: 20px !important;
        margin: 0 !important;
        white-space: nowrap !important;
      }

      p,
      small {
        font-size: 12px !important;
        line-height: 14px !important;
        margin: 0 !important;
      }

      #stage,
      .stage,
      main,
      .preview,
      .viewport {
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: hidden !important;
        position: relative !important;
        box-sizing: border-box !important;
      }

      canvas,
      #avatarCanvas {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        display: block !important;
      }

      button,
      select {
        min-height: 30px !important;
        height: 30px !important;
        padding: 3px 10px !important;
        font-size: 12px !important;
        border-radius: 999px !important;
      }

      #status,
      #pathInfo,
      #avatarName,
      #avatarFile {
        font-size: 12px !important;
        line-height: 14px !important;
      }

      #error {
        position: absolute !important;
        left: 12px !important;
        right: 12px !important;
        bottom: 12px !important;
        z-index: 50 !important;
        max-height: 120px !important;
        overflow: auto !important;
      }
    `;

    doc.head?.appendChild(style);

    const stage = doc.getElementById("stage") || doc.querySelector(".stage, main, .preview, .viewport");
    if (stage) {
      important(stage, "height", "100%");
      important(stage, "min-height", "0");
      important(stage, "overflow", "hidden");
    }

    const canvas = doc.querySelector("canvas");
    if (canvas) {
      important(canvas, "width", "100%");
      important(canvas, "height", "100%");
      // força resize do WebGL/Three sem depender do usuário mexer na janela
      try {
        window.dispatchEvent(new Event("resize"));
        frame.contentWindow?.dispatchEvent?.(new Event("resize"));
      } catch {}
    }

    const fitButton = doc.getElementById("btnFit") || doc.querySelector('[data-action="fit"], button[title*="corpo"], button[title*="fit"]');
    if (fitButton) {
      setTimeout(() => { try { fitButton.click(); } catch {} }, 200);
      setTimeout(() => { try { fitButton.click(); } catch {} }, 800);
    }
  }

  function boot() {
    injectCss();
    tuneOuter();

    const frame = document.getElementById("avatarLoadfileWorkingFrameV1983");
    if (frame) {
      frame.addEventListener("load", () => {
        setTimeout(tuneOuter, 50);
        setTimeout(tuneOuter, 250);
        setTimeout(tuneOuter, 900);
      });
    }

    const observer = new MutationObserver(() => tuneOuter());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });

    window.addEventListener("resize", tuneOuter);

    document.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-target='avatar'], [data-tab='avatar'], #avatarLoadfileReloadWorking");
      if (btn) {
        setTimeout(tuneOuter, 80);
        setTimeout(tuneOuter, 450);
      }
    });

    log("ativo");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();