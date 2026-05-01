const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-owner-v38] " + msg);
}

function restorePreviewAppIfNeeded() {
  const app = path.join(ROOT, "src", "renderer", "avatar_loadfile_preview_v19_8_3_app.mjs");
  const backup = app + ".bak_v34";

  if (!fs.existsSync(app)) {
    log("preview app não encontrado");
    return;
  }

  const current = fs.readFileSync(app, "utf8");

  if (current.includes("AVATAR_TRUE_SIZE_V34") && fs.existsSync(backup)) {
    fs.copyFileSync(backup, app);
    log("preview app restaurado do backup v34");
  } else {
    log("preview app preservado");
  }
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado");
    process.exitCode = 1;
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  const blocked = [
    "noelle_avatar_tab_v19_8_2.js",
    "avatar_legacy_blocker_v27.js",
    "avatar_renderer_restore_v27_1.js",
    "restore_avatar_carousel_runtime_v28.js",
    "avatar_window_unified_v29.js",
    "avatar_page_v30.js",
    "avatar_page_v31.js",
    "avatar_loadfile_page_v32.js",
    "avatar_carousel_mount_v31.js",
    "avatar_assets_bridge_v31_2.js",
    "avatar_loadfile_layout_v33.js",
    "avatar_loadfile_true_size_v34.js",
    "avatar_loadfile_fixed_sizes_v36.js",
    "avatar_outer_size_only_v36_1.js",
    "avatar_restore_loadfile_v19_8_3.js",
    "avatar_loadfile_size_640"
  ];

  for (const name of blocked) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    html = html.replace(
      new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"),
      `<!-- disabled ${name} by avatar_single_render_owner_v38 -->`
    );

    html = html.replace(
      new RegExp(`<link[^>]*${escaped}[^>]*>`, "g"),
      `<!-- disabled ${name} by avatar_single_render_owner_v38 -->`
    );
  }

  const tag = '<script src="./renderer/pages/avatar/avatar_render_owner_v38.js"></script>';

  if (!html.includes("avatar_render_owner_v38.js")) {
    html = html.replace("</body>", tag + "\n</body>");
    log("owner v38 injetado");
  } else {
    log("owner v38 já estava injetado");
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html corrigido");
}

restorePreviewAppIfNeeded();
patchControls();

log("patch aplicado");