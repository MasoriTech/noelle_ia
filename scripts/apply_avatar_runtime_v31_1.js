const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-runtime-v31.1] " + msg);
}

function ensureDir(dir) {
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
}

function copyPackFile(from, to) {
  const src = path.join(ROOT, from);
  const dst = path.join(ROOT, to);

  if (!fs.existsSync(src)) {
    log("pack file missing after extraction: " + from);
    return;
  }

  ensureDir(path.dirname(to));
  fs.copyFileSync(src, dst);
  log("updated: " + to);
}

function patchControls() {
  const controls = path.join(ROOT, "src", "controls.html");
  if (!fs.existsSync(controls)) {
    log("src/controls.html not found");
    return;
  }

  let html = fs.readFileSync(controls, "utf8");

  // Keep v31 page injection, only replace the mount implementation.
  // Remove v31 iframe frame if some older runtime script references it.
  html = html.replace(
    /<script[^>]*avatar_window_unified_v29\.js[^>]*><\/script>/g,
    "<!-- disabled v29 by avatar v31.1 direct carousel -->"
  );
  html = html.replace(
    /<script[^>]*restore_avatar_carousel_runtime_v28\.js[^>]*><\/script>/g,
    "<!-- disabled v28 by avatar v31.1 direct carousel -->"
  );
  html = html.replace(
    /<script[^>]*avatar_renderer_restore_v27_1\.js[^>]*><\/script>/g,
    "<!-- disabled v27.1 by avatar v31.1 direct carousel -->"
  );
  html = html.replace(
    /<script[^>]*noelle_avatar_tab_v19_8_2\.js[^>]*><\/script>/g,
    "<!-- disabled legacy avatar v19_8_2 by avatar v31.1 direct carousel -->"
  );

  fs.writeFileSync(controls, html, "utf8");
  log("controls.html legacy references cleaned");
}

copyPackFile(
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js",
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js"
);

patchControls();

log("avatar direct carousel v31.1 applied");