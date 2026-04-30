#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP = path.join(ROOT, "backups", `v19_8_3_resolucao_loadfile_${STAMP}`);

function log(msg) { console.log(msg); }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function write(rel, txt) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, txt, "utf8");
}
function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(BACKUP, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  ok(`Backup: ${rel}`);
}
function patchText(rel, fn) {
  if (!exists(rel)) { warn(`${rel} não existe; pulando.`); return false; }
  backup(rel);
  const before = read(rel);
  const after = fn(before);
  if (after !== before) {
    write(rel, after);
    ok(`Atualizado: ${rel}`);
    return true;
  }
  ok(`${rel} já estava atualizado.`);
  return false;
}

function injectBeforeEnd(text, endTag, snippet, marker) {
  if (text.includes(marker)) return text;
  const idx = text.toLowerCase().lastIndexOf(endTag.toLowerCase());
  if (idx === -1) return text + "\n" + snippet + "\n";
  return text.slice(0, idx) + snippet + "\n" + text.slice(idx);
}

function updatePackage() {
  if (!exists("package.json")) return;
  patchText("package.json", (txt) => {
    const pkg = JSON.parse(txt);
    pkg.version = "19.8.3-resolucao-loadfile-2026";
    pkg.scripts = pkg.scripts || {};
    pkg.scripts["diagnostico:v19.8.3"] = "node scripts/diagnostico_v19_8_3_resolucao_loadfile_2026.cjs";
    pkg.scripts["repair:v19.8.3"] = "node scripts/repair_v19_8_3_resolucao_loadfile_2026.cjs";
    pkg.scripts["status:v19.8.3"] = "node scripts/status_v19_8_3_resolucao_loadfile_2026.cjs";
    return JSON.stringify(pkg, null, 2) + "\n";
  });
}

function patchControlsHtml() {
  if (!exists("src/controls.html")) return;
  patchText("src/controls.html", (txt) => {
    const css = `  <link rel="stylesheet" href="./styles/noelle_avatar_responsive_v19_8_3.css" data-noelle-v19-8-3-resolution>\n`;
    const js = `  <script defer src="./renderer/noelle_avatar_resize_guard_v19_8_3.js" data-noelle-v19-8-3-resolution></script>\n`;
    txt = injectBeforeEnd(txt, "</head>", css, "data-noelle-v19-8-3-resolution");
    txt = injectBeforeEnd(txt, "</body>", js, "noelle_avatar_resize_guard_v19_8_3.js");
    return txt;
  });
}

function patchPreload() {
  if (!exists("preload.js")) return;
  patchText("preload.js", (txt) => {
    if (!txt.includes("openAvatarPreviewLoadFile")) {
      const re = /contextBridge\.exposeInMainWorld\(\s*["']noelleAPI["']\s*,\s*\{/;
      if (re.test(txt)) {
        txt = txt.replace(re, (m) => `${m}
  openAvatarPreviewLoadFile: (avatar) => ipcRenderer.invoke("noelle:open-avatar-preview-loadfile", avatar),
  openAvatarWindowLoadFile: (avatar) => ipcRenderer.invoke("noelle:open-avatar-window-loadfile", avatar),`);
      } else {
        warn("Não encontrei contextBridge.exposeInMainWorld(\"noelleAPI\", { em preload.js.");
      }
    }
    return txt;
  });
}

function patchMain() {
  if (!exists("main.js")) return;
  patchText("main.js", (txt) => {
    if (txt.includes("NOELLE_V19_8_3_LOADFILE_BEGIN")) return txt;
    const block = `

// NOELLE_V19_8_3_LOADFILE_BEGIN
// Preview/Teste aberto por BrowserWindow.loadFile(), evitando fetch frágil para HTML local.
function noelleV1983SafeAvatarRel(input) {
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object") raw = input.rel || input.path || input.file || input.avatar || "";
  raw = String(raw || "").replace(/\\\\/g, "/").trim();
  raw = raw.replace(/^file:\\/\\/\\/?/i, "");
  raw = raw.replace(/^.*?\\/src\\//i, "");
  raw = raw.replace(/^src\\//i, "");
  raw = raw.replace(/^\\/+/, "");
  if (!raw) raw = "assets/Noelle.vrm";
  if (raw.includes("..")) throw new Error("Caminho de avatar inseguro: " + raw);
  if (!/\\.(vrm|glb)$/i.test(raw)) throw new Error("Avatar precisa ser .vrm ou .glb: " + raw);
  return raw;
}

function noelleV1983PreviewHtmlPath() {
  const rootDir = typeof ROOT_DIR !== "undefined" ? ROOT_DIR : __dirname;
  const srcDir = typeof SRC_DIR !== "undefined" ? SRC_DIR : path.join(rootDir, "src");
  return path.join(srcDir, "avatar_loadfile_preview_v19_8_3.html");
}

async function noelleV1983OpenAvatarPreviewLoadFile(input) {
  const rootDir = typeof ROOT_DIR !== "undefined" ? ROOT_DIR : __dirname;
  const rel = noelleV1983SafeAvatarRel(input);
  const html = noelleV1983PreviewHtmlPath();
  if (!fs.existsSync(html)) throw new Error("Preview HTML não encontrado: " + html);

  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 520,
    minHeight: 420,
    show: false,
    title: "Noelle Preview / Teste",
    backgroundColor: "#0b0612",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(rootDir, "preload.js")
    }
  });

  win.once("ready-to-show", () => win.show());
  await win.loadFile(html, { query: { avatar: rel, source: "loadFile" } });
  return { ok: true, avatar: rel };
}

try {
  ipcMain.handle("noelle:open-avatar-preview-loadfile", async (_event, avatar) => {
    try {
      return await noelleV1983OpenAvatarPreviewLoadFile(avatar);
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });
} catch (err) {
  // Se o handler já existir, não derruba o app.
  console.warn("[Noelle V19.8.3] handler preview loadFile não registrado:", err && err.message || err);
}

try {
  ipcMain.handle("noelle:open-avatar-window-loadfile", async (_event, avatar) => {
    try {
      return await noelleV1983OpenAvatarPreviewLoadFile(avatar);
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });
} catch (err) {
  console.warn("[Noelle V19.8.3] handler avatar loadFile não registrado:", err && err.message || err);
}
// NOELLE_V19_8_3_LOADFILE_END
`;
    return txt + block;
  });
}

function updateMemory() {
  if (!exists("MEMORIA_GPT_NOELLE.md")) return;
  patchText("MEMORIA_GPT_NOELLE.md", (txt) => {
    if (txt.includes("V19.8.3 — Resolução + LoadFile")) return txt;
    return txt + `

## V19.8.3 — Resolução + LoadFile
- A aba Avatar deve ser responsiva: avatar grande acompanha a janela, opções ficam à direita e descem em telas menores.
- O preview de teste deve ter caminho seguro por BrowserWindow.loadFile() para evitar falhas frágeis de fetch em file://.
- O layout deve usar grid/flex, minmax(0, 1fr), overflow auto e breakpoints.
- A opção [1] do iniciar.bat continua apenas iniciando o programa, sem aplicar patch automaticamente.
`;
  });
}

function main() {
  log("================================================================");
  log(" Noelle V19.8.3 - reparo Resolução + LoadFile");
  log("================================================================");
  fs.mkdirSync(BACKUP, { recursive: true });

  updatePackage();
  patchControlsHtml();
  patchPreload();
  patchMain();
  updateMemory();

  ok("Reparo V19.8.3 concluído.");
  ok("Backup: " + path.relative(ROOT, BACKUP));
}

try {
  main();
} catch (err) {
  fail(err && err.stack || err);
}
