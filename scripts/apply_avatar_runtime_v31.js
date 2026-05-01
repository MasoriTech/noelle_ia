const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-runtime-v31] " + msg);
}

function ensureDir(p) {
  fs.mkdirSync(path.join(ROOT, p), { recursive: true });
}

function copyIfMissing(from, to) {
  const src = path.join(ROOT, from);
  const dst = path.join(ROOT, to);
  if (!fs.existsSync(src)) {
    log("missing packaged file: " + from);
    return;
  }
  ensureDir(path.dirname(to));
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    log("created: " + to);
  } else {
    log("exists, kept: " + to);
  }
}

function disableScriptRefs(html) {
  const blocked = [
    "noelle_avatar_tab_v19_8_2.js",
    "avatar_renderer_restore_v27_1.js",
    "restore_avatar_carousel_runtime_v28.js",
    "avatar_window_unified_v29.js",
    "avatar_page_v30.js"
  ];

  for (const name of blocked) {
    const regex = new RegExp(`<script[^>]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*><\\/script>`, "g");
    html = html.replace(regex, `<!-- disabled ${name} by avatar_runtime_v31 -->`);
  }

  return html;
}

function injectOnce(html, tag, marker) {
  if (html.includes(marker)) return html;
  return html.replace("</body>", tag + "\n</body>");
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html not found");
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  html = disableScriptRefs(html);

  const tags = [
    '<script src="./renderer/services/config/avatar_config_service_v31.js"></script>',
    '<script src="./renderer/modules/avatar/avatar_legacy_blocker_v31.js"></script>',
    '<script src="./renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js"></script>',
    '<script src="./renderer/pages/avatar/avatar_page_v31.js"></script>'
  ].join("\n");

  html = injectOnce(html, tags, "avatar_page_v31.js");

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html patched");
}

patchControls();
log("avatar runtime v31 applied");