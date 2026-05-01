(() => {
  "use strict";

  const VERSION = "v31.2";

  function log(...args) {
    console.log("[avatar-assets-bridge-v31.2]", ...args);
  }

  function normalizeAvatar(item, index) {
    if (!item) return null;

    const rel = item.rel || item.file || item.path || "";
    const name =
      item.name ||
      String(rel).split(/[\\/]/).pop()?.replace(/\.vrm$/i, "") ||
      `Avatar ${index + 1}`;

    return {
      id: item.id || name.toLowerCase().replace(/[^a-z0-9_-]+/gi, "-"),
      name,
      label: name,
      file: rel,
      rel,
      path: item.path || rel,
      url: item.url || item.fileUrl || item.href || rel,
      kind: item.kind || "vrm"
    };
  }

  function normalizeList(result) {
    const raw =
      result?.avatars ||
      result?.assets?.avatars ||
      result?.vrms ||
      result?.data?.avatars ||
      [];

    return Array.isArray(raw)
      ? raw.map(normalizeAvatar).filter(Boolean)
      : [];
  }

  async function callApis() {
    const attempts = [
      () => window.yoruAvatarAssets?.list?.(),
      () => window.noelleAPI?.assets?.(),
      () => window.desktopWidget?.getAssets?.(),
      () => window.desktopWidget?.listAssets?.(),
      () => window.noelleAssets?.list?.(),
      () => window.YoruIPC?.invoke?.("yoru:avatars:list")
    ];

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        const list = normalizeList(result);
        if (list.length) return list;
      } catch {}
    }

    return [];
  }

  function buildManifest(list) {
    return {
      schema: "avatar_manifest_runtime_v31_2",
      avatars: list.map((a) => ({
        id: a.id,
        name: a.name,
        label: a.name,
        file: a.rel || a.file,
        rel: a.rel || a.file,
        path: a.path || a.rel || a.file,
        url: a.url,
        kind: "vrm",
        enabled: true
      }))
    };
  }

  function installFetchShim(list) {
    const originalFetch = window.fetch?.bind(window);
    if (!originalFetch || window.__AVATAR_FETCH_SHIM_V31_2__) return;

    window.__AVATAR_FETCH_SHIM_V31_2__ = true;

    window.fetch = async function(input, init) {
      const url = String(typeof input === "string" ? input : input?.url || "");

      if (/avatar.*manifest|manifest.*avatar|avatar_manifest|avatars\.json|avatar_state\.json/i.test(url)) {
        const manifest = buildManifest(window.__YORU_AVATAR_LIST_V31_2__ || list || []);
        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return originalFetch(input, init);
    };

    log("fetch shim installed");
  }

  function installGlobalAliases(list) {
    const manifest = buildManifest(list);

    window.__YORU_AVATAR_LIST_V31_2__ = list;
    window.__NOELLE_AVATAR_LIST__ = list;
    window.__NOELLE_AVATAR_MANIFEST__ = manifest;
    window.__YORU_AVATAR_MANIFEST__ = manifest;

    window.avatarAssets = window.avatarAssets || {};
    window.avatarAssets.list = async () => list;
    window.avatarAssets.listAvatars = async () => list;
    window.avatarAssets.manifest = async () => manifest;

    window.noelleAvatarAssets = window.noelleAvatarAssets || {};
    window.noelleAvatarAssets.list = async () => list;
    window.noelleAvatarAssets.listAvatars = async () => list;
    window.noelleAvatarAssets.manifest = async () => manifest;

    window.yoruAvatarAssetsRuntime = {
      version: VERSION,
      list: async () => list,
      manifest: async () => manifest
    };

    log("avatars available:", list.length);
  }

  function updateFallbackUi(list) {
    const countPill = document.getElementById("countPill");
    if (countPill) countPill.textContent = `Avatares: ${list.length}`;

    const select = document.getElementById("avatarSelect");
    if (select && select.options.length === 0) {
      for (const avatar of list) {
        const option = document.createElement("option");
        option.value = avatar.rel || avatar.file || avatar.url;
        option.textContent = avatar.name;
        select.appendChild(option);
      }
    }

    const first = list[0];

    if (first) {
      const name = document.getElementById("avatarName");
      const file = document.getElementById("avatarFile");
      if (name && /Nenhum avatar/i.test(name.textContent || "")) name.textContent = first.name;
      if (file && /src\/assets/i.test(file.textContent || "")) file.textContent = first.rel || first.file || first.url;

      const status = document.getElementById("statusPill");
      if (status) status.textContent = "avatar encontrado";
    }
  }

  async function boot() {
    const list = await callApis();

    installGlobalAliases(list);
    installFetchShim(list);
    updateFallbackUi(list);

    document.dispatchEvent(new CustomEvent("yoru:avatars-ready", {
      detail: { avatars: list, manifest: buildManifest(list) }
    }));
  }

  window.AvatarAssetsBridgeV312 = { boot, normalizeList, buildManifest };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();