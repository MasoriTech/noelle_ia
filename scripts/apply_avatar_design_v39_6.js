const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-v39.6] " + msg);
}

function backupFile(file) {
  if (!fs.existsSync(file)) return;
  const backup = file + ".bak_v39_6";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    log("backup criado: " + path.relative(ROOT, backup));
  }
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
    backupFile(app);
    fs.copyFileSync(backup, app);
    log("preview app restaurado do backup v34");
  } else {
    log("preview app preservado");
  }
}

function deactivateTag(html, fileName) {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  html = html.replace(new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"), `<!-- disabled ${fileName} by avatar_v39_6 -->`);
  html = html.replace(new RegExp(`<link[^>]*${escaped}[^>]*>`, "g"), `<!-- disabled ${fileName} by avatar_v39_6 -->`);
  return html;
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado");
    process.exitCode = 1;
    return;
  }

  backupFile(controlsPath);

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
    "avatar_render_owner_v38.js",
    "avatar_design_owner_v39.js",
    "avatar_design_owner_v39_1.js",
    "avatar_design_owner_v39_2.js",
    "avatar_design_owner_v39_3.js",
    "avatar_design_owner_v39_4.js",
    "avatar_design_owner_v39_5.js",
    "avatar_design_owner_v39_6.js",
    "avatar_design_v39_6.css",
    "avatar_loadfile_size_640"
  ];

  for (const name of blocked) {
    html = deactivateTag(html, name);
  }

  const scriptTag = '<script src="./renderer/pages/avatar/avatar_design_owner_v39_6.js"></script>';

  if (html.includes("</body>")) {
    html = html.replace("</body>", scriptTag + "\n</body>");
  } else {
    html += "\n" + scriptTag + "\n";
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html corrigido com owner v39.6");
}

restorePreviewAppIfNeeded();
patchControls();

log("patch aplicado");