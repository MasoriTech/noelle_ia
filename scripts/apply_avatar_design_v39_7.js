const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-v39.7] " + msg);
}

function backupFile(file) {
  if (!fs.existsSync(file)) return;
  const backup = file + ".bak_v39_7";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    log("backup criado: " + path.relative(ROOT, backup));
  }
}

function deactivateTag(html, fileName) {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  html = html.replace(new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"), `<!-- disabled ${fileName} by avatar_v39_7 -->`);
  html = html.replace(new RegExp(`<link[^>]*${escaped}[^>]*>`, "g"), `<!-- disabled ${fileName} by avatar_v39_7 -->`);
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
    "avatar_design_owner_v39_7.js",
    "avatar_design_v39_7.css",
    "avatar_loadfile_size_640"
  ];

  for (const name of blocked) {
    html = deactivateTag(html, name);
  }

  const scriptTag = '<script src="./renderer/pages/avatar/avatar_design_owner_v39_7.js"></script>';

  if (html.includes("</body>")) {
    html = html.replace("</body>", scriptTag + "\n</body>");
  } else {
    html += "\n" + scriptTag + "\n";
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html corrigido com owner v39.7");
}

function patchPreviewQuery() {
  const script = path.join(ROOT, "scripts", "patch_avatar_preview_query_v39_7.js");
  if (!fs.existsSync(script)) {
    log("patch_avatar_preview_query_v39_7.js não encontrado");
    return;
  }

  try {
    childProcess.execFileSync("node", [script], { cwd: ROOT, stdio: "inherit" });
  } catch (err) {
    log("patch do preview falhou; owner ainda será aplicado");
  }
}

patchControls();
patchPreviewQuery();
log("patch aplicado");