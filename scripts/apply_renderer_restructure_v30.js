const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[renderer-restructure-v30] " + msg);
}

function ensureDir(p) {
  fs.mkdirSync(path.join(ROOT, p), { recursive: true });
}

function copyIfExists(from, to) {
  const src = path.join(ROOT, from);
  const dst = path.join(ROOT, to);
  if (!fs.existsSync(src)) {
    log("skip missing: " + from);
    return false;
  }
  ensureDir(path.dirname(to));
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    log("copied: " + from + " -> " + to);
  } else {
    log("exists, kept: " + to);
  }
  return true;
}

function writeFileOnce(file, content) {
  const target = path.join(ROOT, file);
  ensureDir(path.dirname(file));
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, content, "utf8");
    log("created: " + file);
  } else {
    log("exists, kept: " + file);
  }
}

function injectScriptOnce(htmlFile, scriptTag, marker) {
  const file = path.join(ROOT, htmlFile);
  if (!fs.existsSync(file)) {
    log("html missing: " + htmlFile);
    return;
  }
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(marker)) {
    log("script already injected: " + marker);
    return;
  }
  if (!html.includes("</body>")) {
    log("no </body> found in " + htmlFile);
    return;
  }
  html = html.replace("</body>", scriptTag + "\n</body>");
  fs.writeFileSync(file, html, "utf8");
  log("injected script into " + htmlFile + ": " + marker);
}

// 1) Create professional renderer tree
[
  "src/renderer/pages/avatar",
  "src/renderer/pages/stream",
  "src/renderer/pages/chat",
  "src/renderer/widgets/vrm_canvas",
  "src/renderer/modules/avatar",
  "src/renderer/modules/stt",
  "src/renderer/modules/agent",
  "src/renderer/services/ipc",
  "src/renderer/services/config",
  "src/renderer/services/runtime",
].forEach(ensureDir);

// 2) Safe-copy current working scripts into organized folders.
// Old files are NOT deleted. This prevents breakage.
copyIfExists("src/renderer/pages/noelle_stream_page_v19_8_29.js", "src/renderer/pages/stream/stream_page_legacy_bridge_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js", "src/renderer/pages/stream/stream_audio_capture_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_vad_v19_8_31.js", "src/renderer/modules/stt/stream_vad_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js", "src/renderer/modules/stt/stream_segment_recorder_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_segment_exporter_v20.js", "src/renderer/modules/stt/stream_segment_exporter_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_stt_selector_v21.js", "src/renderer/modules/stt/stt_selector_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_stt_status_v22.js", "src/renderer/modules/stt/stt_status_v30.js");
copyIfExists("src/renderer/modules/noelle_stream_inference_timer_v23.js", "src/renderer/modules/stt/stt_inference_timer_v30.js");

copyIfExists("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs", "src/renderer/widgets/vrm_canvas/vrm_fileload_renderer_v30.mjs");
copyIfExists("src/renderer_dist/avatar_carousel_v19_7_6.bundle.js", "src/renderer/widgets/vrm_canvas/avatar_carousel_bundle_v30.js");
copyIfExists("src/renderer/noelle_avatar_compact_import_v19_8_20.js", "src/renderer/modules/avatar/avatar_import_v30.js");
copyIfExists("src/renderer/noelle_avatar_fit_viewport_v19_8_18.js", "src/renderer/modules/avatar/avatar_fit_viewport_v30.js");
copyIfExists("src/renderer/noelle_avatar_target_guard_v19_8_17.js", "src/renderer/modules/avatar/avatar_target_guard_v30.js");

copyIfExists("src/runtime/agent_identity_loader_v1.js", "src/renderer/modules/agent/agent_identity_loader_v30.js");
copyIfExists("src/runtime/agent_memory_loader_v25.js", "src/renderer/modules/agent/agent_memory_loader_v30.js");
copyIfExists("src/runtime/agent_memory_autowrite_runtime_v26.js", "src/renderer/modules/agent/agent_memory_autowrite_v30.js");

// 3) Create clean avatar page orchestrator.
// It mounts exactly one avatar container and tries carousel first.
// It does not enable noelle_avatar_tab_v19_8_2.js.
writeFileOnce("src/renderer/pages/avatar/avatar_page_v30.js", `
(() => {
  "use strict";

  const VERSION = "avatar_page_v30";
  const PAGE_SELECTOR = '[data-page="avatar"]';
  const MOUNT_ID = "avatarMountV30";

  function log(...args) {
    console.log("[avatar-page-v30]", ...args);
  }

  function getAvatarPage() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function removeKnownLegacy() {
    const legacySelectors = [
      "#avatarPreview:not([data-keep])",
      "#noelleAvatarV1982",
      ".noelle-avatar-v1982"
    ];

    legacySelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el.id === MOUNT_ID) return;
        el.remove();
        log("removed legacy node:", selector);
      });
    });

    try {
      window.__NOELLE_AVATAR_TAB_V1978_LEGACY_REDIRECT__ = false;
    } catch {}
  }

  function ensureMount() {
    const page = getAvatarPage();
    if (!page) {
      log("avatar page not found");
      return null;
    }

    let mount = document.getElementById(MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("section");
    mount.id = MOUNT_ID;
    mount.dataset.renderer = VERSION;
    mount.style.width = "100%";
    mount.style.minHeight = "460px";
    mount.style.position = "relative";
    mount.style.borderRadius = "18px";
    mount.style.overflow = "hidden";
    mount.style.background = "#0b0b12";
    mount.style.margin = "12px 0";

    page.prepend(mount);
    log("mount created");
    return mount;
  }

  function injectCarousel(mount) {
    if (!mount || window.__YORU_AVATAR_CAROUSEL_V30_ACTIVE__) return;

    const script = document.createElement("script");
    script.src = "./renderer/widgets/vrm_canvas/avatar_carousel_bundle_v30.js";
    script.onload = () => {
      window.__YORU_AVATAR_CAROUSEL_V30_ACTIVE__ = true;
      log("carousel bundle loaded");
    };
    script.onerror = () => {
      log("carousel bundle failed, trying original bundle");
      const fallback = document.createElement("script");
      fallback.src = "./renderer_dist/avatar_carousel_v19_7_6.bundle.js";
      mount.appendChild(fallback);
    };

    mount.appendChild(script);
  }

  function boot() {
    removeKnownLegacy();
    const mount = ensureMount();
    injectCarousel(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`);

// 4) Create stream page orchestrator that only coordinates; old Stream remains usable.
writeFileOnce("src/renderer/pages/stream/stream_page_v30.js", `
(() => {
  "use strict";

  function log(...args) {
    console.log("[stream-page-v30]", ...args);
  }

  function ensureStreamStatus() {
    const page = document.querySelector('[data-page="stream"]') || document.querySelector("#page-stream");
    if (!page) return;

    if (!document.getElementById("streamRuntimeStatusV30")) {
      const box = document.createElement("div");
      box.id = "streamRuntimeStatusV30";
      box.style.marginTop = "8px";
      box.textContent = "Stream runtime v30 ativo";
      page.appendChild(box);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureStreamStatus);
  } else {
    ensureStreamStatus();
  }

  log("loaded");
})();
`);

// 5) Create IPC service wrapper.
writeFileOnce("src/renderer/services/ipc/ipc_bridge_v30.js", `
(() => {
  "use strict";

  const api = {
    invoke(channel, ...args) {
      const bridge = window.yoru || window.electron || window.api;
      if (bridge?.invoke) return bridge.invoke(channel, ...args);
      if (window.electronAPI?.invoke) return window.electronAPI.invoke(channel, ...args);
      console.warn("[ipc-bridge-v30] no IPC bridge available:", channel);
      return Promise.resolve(null);
    }
  };

  window.YoruIPC = window.YoruIPC || api;
})();
`);

// 6) Create config service wrapper.
writeFileOnce("src/renderer/services/config/config_loader_v30.js", `
(() => {
  "use strict";

  window.YoruConfig = window.YoruConfig || {
    async loadJson(url, fallback = {}) {
      try {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        return await res.json();
      } catch {
        return fallback;
      }
    }
  };
})();
`);

// 7) Create runtime boot manifest.
writeFileOnce("src/renderer/services/runtime/renderer_boot_v30.js", `
(() => {
  "use strict";
  console.log("[renderer-boot-v30] renderer structure ready");
})();
`);

// 8) Neutralize the avatar legacy script reference in controls.html if present.
const controlsPath = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controlsPath)) {
  let html = fs.readFileSync(controlsPath, "utf8");

  html = html.replace(
    /<script[^>]*noelle_avatar_tab_v19_8_2\\.js[^>]*><\\/script>/g,
    "<!-- disabled legacy avatar tab v19_8_2 by renderer_restructure_v30 -->"
  );

  // Avoid injecting old restore scripts repeatedly if they exist from previous packs.
  html = html.replace(
    /<script[^>]*avatar_renderer_restore_v27_1\\.js[^>]*><\\/script>/g,
    "<!-- disabled avatar renderer restore v27.1 by renderer_restructure_v30 -->"
  );
  html = html.replace(
    /<script[^>]*restore_avatar_carousel_runtime_v28\\.js[^>]*><\\/script>/g,
    "<!-- disabled avatar carousel restore v28 by renderer_restructure_v30 -->"
  );
  html = html.replace(
    /<script[^>]*avatar_window_unified_v29\\.js[^>]*><\\/script>/g,
    "<!-- disabled avatar window unified v29 by renderer_restructure_v30 -->"
  );

  fs.writeFileSync(controlsPath, html, "utf8");
  log("legacy avatar injectors neutralized in controls.html");
}

// 9) Inject clean v30 boot order.
injectScriptOnce(
  "src/controls.html",
  '<script src="./renderer/services/ipc/ipc_bridge_v30.js"></script>\\n' +
  '<script src="./renderer/services/config/config_loader_v30.js"></script>\\n' +
  '<script src="./renderer/services/runtime/renderer_boot_v30.js"></script>\\n' +
  '<script src="./renderer/pages/avatar/avatar_page_v30.js"></script>\\n' +
  '<script src="./renderer/pages/stream/stream_page_v30.js"></script>',
  "avatar_page_v30.js"
);

log("renderer restructure v30 applied");