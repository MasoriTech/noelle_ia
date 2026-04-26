function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/^\.?\//, "");
}

export async function assetExistsLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.assetExists) {
    return !!(await window.desktopWidget.assetExists(clean));
  }
  try {
    const url = new URL(`../${clean}`, import.meta.url);
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function readJsonAssetLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.readJsonAsset) {
    return await window.desktopWidget.readJsonAsset(clean);
  }
  const url = new URL(`../${clean}`, import.meta.url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao ler asset JSON: " + clean);
  return res.json();
}

export async function getAssetFileUrlLocal(relPath) {
  const clean = normalizeRelPath(relPath);
  if (window.desktopWidget?.getAssetFileUrl) {
    return await window.desktopWidget.getAssetFileUrl(clean);
  }
  return new URL(`../${clean}`, import.meta.url).href;
}
