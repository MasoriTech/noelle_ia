const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-v31.3] " + msg);
}

function patchControls() {
  const controls = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controls)) {
    log("src/controls.html não encontrado");
    return;
  }

  let html = fs.readFileSync(controls, "utf8");

  const blocked = [
    "noelle_avatar_tab_v19_8_2.js",
    "avatar_renderer_restore_v27_1.js",
    "restore_avatar_carousel_runtime_v28.js",
    "avatar_window_unified_v29.js",
    "avatar_page_v30.js"
  ];

  for (const name of blocked) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"),
      `<!-- disabled ${name} by avatar v31.3 -->`
    );
  }

  const requiredTags = [
    '<script src="./renderer/services/config/avatar_config_service_v31.js"></script>',
    '<script src="./renderer/modules/avatar/avatar_legacy_blocker_v31.js"></script>',
    '<script src="./renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js"></script>',
    '<script src="./renderer/modules/avatar/avatar_assets_bridge_v31_2.js"></script>',
    '<script src="./renderer/pages/avatar/avatar_page_v31.js"></script>'
  ];

  for (const tag of requiredTags) {
    const marker = tag.match(/src="([^"]+)"/)?.[1]?.split("/").pop();
    if (marker && !html.includes(marker)) {
      html = html.replace("</body>", tag + "\n</body>");
      log("injetado: " + marker);
    }
  }

  fs.writeFileSync(controls, html, "utf8");
  log("controls.html corrigido");
}

patchControls();
log("avatar simple carousel v31.3 aplicado");