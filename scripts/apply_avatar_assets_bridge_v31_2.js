const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-assets-v31.2] " + msg);
}

function patchMain() {
  const mainPath = path.join(ROOT, "main.js");

  if (!fs.existsSync(mainPath)) {
    log("main.js not found");
    return;
  }

  let text = fs.readFileSync(mainPath, "utf8");

  if (!text.includes("avatar_assets_bridge_v31_2.cjs")) {
    const requireLine =
      'try { require("./src/main/avatar_assets_bridge_v31_2.cjs").registerAvatarAssetsBridgeV312(); } catch (err) { console.warn("[avatar-assets-v31.2] bridge failed:", err && err.message ? err.message : err); }\n';

    text = requireLine + text;
    fs.writeFileSync(mainPath, text, "utf8");
    log("main.js patched");
  } else {
    log("main.js already patched");
  }
}

function patchPreload() {
  const preloadPath = path.join(ROOT, "preload.js");

  if (!fs.existsSync(preloadPath)) {
    log("preload.js not found");
    return;
  }

  let text = fs.readFileSync(preloadPath, "utf8");

  if (!text.includes("yoruAvatarAssets")) {
    const snippet = `
;try {
  const { contextBridge, ipcRenderer } = require("electron");
  contextBridge.exposeInMainWorld("yoruAvatarAssets", {
    list: () => ipcRenderer.invoke("yoru:avatars:list"),
    default: () => ipcRenderer.invoke("yoru:avatars:default")
  });
} catch (err) {
  console.warn("[avatar-assets-v31.2] preload bridge unavailable:", err && err.message ? err.message : err);
}
`;

    text += "\n" + snippet;
    fs.writeFileSync(preloadPath, text, "utf8");
    log("preload.js patched");
  } else {
    log("preload.js already patched");
  }
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");
  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html not found");
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  const tag = '<script src="./renderer/modules/avatar/avatar_assets_bridge_v31_2.js"></script>';

  if (!html.includes("avatar_assets_bridge_v31_2.js")) {
    html = html.replace("</body>", tag + "\n</body>");
    fs.writeFileSync(controlsPath, html, "utf8");
    log("controls.html patched");
  } else {
    log("controls.html already patched");
  }
}

patchMain();
patchPreload();
patchControls();
log("avatar assets bridge v31.2 applied");