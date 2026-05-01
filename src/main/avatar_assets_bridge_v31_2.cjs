"use strict";

const fs = require("fs");
const path = require("path");
const { ipcMain, app } = require("electron");

function toFileUrl(filePath) {
  return "file:///" + String(filePath).replace(/\\/g, "/").replace(/^\/+/, "");
}

function walkVrms(dir, rootDir) {
  const out = [];

  if (!fs.existsSync(dir)) return out;

  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();

    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (!entry.name.toLowerCase().endsWith(".vrm")) continue;

      const rel = path.relative(rootDir, full).replace(/\\/g, "/");
      const base = path.basename(entry.name, path.extname(entry.name));

      out.push({
        id: base.toLowerCase().replace(/[^a-z0-9_-]+/gi, "-"),
        name: base,
        file: rel,
        rel,
        path: full,
        url: toFileUrl(full),
        kind: "vrm"
      });
    }
  }

  return out;
}

function listAvatars() {
  const rootDir = app.getAppPath ? app.getAppPath() : process.cwd();
  const candidates = [
    path.join(rootDir, "src", "assets", "avatars"),
    path.join(rootDir, "src", "assets"),
    path.join(rootDir, "assets", "avatars"),
    path.join(rootDir, "assets")
  ];

  const seen = new Set();
  const avatars = [];

  for (const dir of candidates) {
    for (const item of walkVrms(dir, rootDir)) {
      if (seen.has(item.rel)) continue;
      seen.add(item.rel);
      avatars.push(item);
    }
  }

  avatars.sort((a, b) => {
    const ay = /yoru/i.test(a.name) ? 0 : 1;
    const by = /yoru/i.test(b.name) ? 0 : 1;
    if (ay !== by) return ay - by;
    return a.name.localeCompare(b.name);
  });

  return avatars;
}

function registerAvatarAssetsBridgeV312() {
  if (global.__YORU_AVATAR_ASSETS_BRIDGE_V31_2__) return;
  global.__YORU_AVATAR_ASSETS_BRIDGE_V31_2__ = true;

  ipcMain.handle("yoru:avatars:list", async () => {
    const avatars = listAvatars();

    return {
      ok: true,
      avatars,
      assets: { avatars },
      count: avatars.length
    };
  });

  ipcMain.handle("yoru:avatars:default", async () => {
    const avatars = listAvatars();
    return {
      ok: avatars.length > 0,
      avatar: avatars[0] || null
    };
  });

  console.log("[avatar-assets-bridge-v31.2] registered");
}

module.exports = {
  registerAvatarAssetsBridgeV312,
  listAvatars
};