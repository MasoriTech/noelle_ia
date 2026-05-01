const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[restore-loadfile-v19.8.3] " + msg);
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado.");
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
    "avatar_assets_bridge_v31_2.js"
  ];

  for (const name of blocked) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"),
      `<!-- disabled ${name} by restore_loadfile_v19_8_3_working -->`
    );
  }

  const tag = '<script src="./renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js"></script>';

  if (!html.includes("avatar_restore_loadfile_v19_8_3.js")) {
    html = html.replace("</body>", tag + "\n</body>");
    log("injetado avatar_restore_loadfile_v19_8_3.js");
  } else {
    log("avatar_restore_loadfile_v19_8_3.js já estava injetado");
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html corrigido");
}

patchControls();
log("patch aplicado");