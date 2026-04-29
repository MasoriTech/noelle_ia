#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", `v19_8_1_preload_limpo_${STAMP}`);
const VERSION_TAG = "V19.8.1 Preload Limpo 2026";

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(file) {
  try { return fs.existsSync(file); } catch { return false; }
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, "utf8");
}

function backup(file) {
  if (!exists(file)) return;
  const dst = path.join(BACKUP_DIR, rel(file));
  ensureDir(path.dirname(dst));
  fs.copyFileSync(file, dst);
  console.log(`[OK] Backup: ${rel(file)} -> ${rel(dst)}`);
}

function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function removeMarkedBlock(text, begin, end) {
  const before = text;
  const re = new RegExp(`\\n?\\s*//\\s*${begin}[\\s\\S]*?//\\s*${end}\\s*`, "g");
  text = text.replace(re, "\n");
  return { text, changed: text !== before };
}

function removeLegacyScriptTags(html) {
  let changed = false;
  const patterns = [
    /\s*<script\b[^>]*src=["'][^"']*noelle_v19_3_complete_ui_md\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    /\s*<script\b[^>]*src=["'][^"']*avatar_v19_5_panel_bootstrap\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    /\s*<script\b[^>]*src=["'][^"']*noelle_avatar_tab_v19_7_5_runtime\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi
  ];
  for (const re of patterns) {
    const next = html.replace(re, "\n");
    if (next !== html) changed = true;
    html = next;
  }
  return { text: html, changed };
}

function patchPreload() {
  const file = path.join(ROOT, "preload.js");
  if (!exists(file)) throw new Error("preload.js não encontrado na raiz do projeto.");
  backup(file);
  let text = normalizeNewlines(read(file));
  let changed = false;

  const blocks = [
    ["NOELLE_V19_3_COMPLETE_PRELOAD_BEGIN", "NOELLE_V19_3_COMPLETE_PRELOAD_END"],
    ["NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN", "NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_END"],
    ["NOELLE_V19_7_5_AVATAR_CLEAN_PRELOAD_BEGIN", "NOELLE_V19_7_5_AVATAR_CLEAN_PRELOAD_END"],
    ["NOELLE_V19_7_6_MEGA_AVATAR_PRELOAD_BEGIN", "NOELLE_V19_7_6_MEGA_AVATAR_PRELOAD_END"],
    ["NOELLE_V19_7_8_AVATAR_FINAL_LAYOUT_PRELOAD_BEGIN", "NOELLE_V19_7_8_AVATAR_FINAL_LAYOUT_PRELOAD_END"]
  ];
  for (const [begin, end] of blocks) {
    const result = removeMarkedBlock(text, begin, end);
    text = result.text;
    changed ||= result.changed;
  }

  // Caso algum patch antigo tenha perdido os marcadores, neutraliza injeções explícitas sem tocar nas APIs.
  const unsafeRuntimeRefs = [
    "./renderer/noelle_v19_3_complete_ui_md.js",
    "./renderer/avatar_v19_5_panel_bootstrap.js",
    "renderer/noelle_v19_3_complete_ui_md.js",
    "renderer/avatar_v19_5_panel_bootstrap.js"
  ];
  for (const ref of unsafeRuntimeRefs) {
    if (text.includes(ref)) {
      text = text.split(ref).join(`__NOELLE_LEGACY_VISUAL_RUNTIME_DISABLED__/${ref}`);
      changed = true;
    }
  }

  // Mantém compatibilidade com código que chamava window.noelleRoomV19, mas sem injetar UI.
  if (!/NOELLE_V19_8_1_ROOM_COMPAT_PRELOAD_BEGIN/.test(text) && !/exposeInMainWorld\(\s*["']noelleRoomV19["']/.test(text)) {
    text += `\n\n// NOELLE_V19_8_1_ROOM_COMPAT_PRELOAD_BEGIN\n` +
      `// Compatibilidade: API Room V19 sem injetar botão/painel visual antigo.\n` +
      `try {\n` +
      `  contextBridge.exposeInMainWorld("noelleRoomV19", {\n` +
      `    open: () => ipcRenderer.invoke("room:open"),\n` +
      `    close: () => ipcRenderer.invoke("room:close"),\n` +
      `    listCatalog: () => ipcRenderer.invoke("room:catalog"),\n` +
      `    loadLayout: () => ipcRenderer.invoke("room:load-layout"),\n` +
      `    saveLayout: (layout) => ipcRenderer.invoke("room:save-layout", layout)\n` +
      `  });\n` +
      `} catch (err) {\n` +
      `  try { console.warn("[Noelle V19.8.1] noelleRoomV19 já exposto ou indisponível", err); } catch {}\n` +
      `}\n` +
      `// NOELLE_V19_8_1_ROOM_COMPAT_PRELOAD_END\n`;
    changed = true;
  }

  // Marca explícita para diagnóstico futuro.
  if (!/NOELLE_V19_8_1_PRELOAD_LIMPO_APLICADO/.test(text)) {
    text += `\n// NOELLE_V19_8_1_PRELOAD_LIMPO_APLICADO\n`;
    changed = true;
  }

  if (changed) {
    write(file, text.trim() + "\n");
    console.log("[OK] preload.js limpo: injeções visuais V19.3/V19.5 removidas.");
  } else {
    console.log("[OK] preload.js já estava sem injeção visual antiga.");
  }
}

function patchControlsHtml() {
  const file = path.join(ROOT, "src", "controls.html");
  if (!exists(file)) {
    console.log("[AVISO] src/controls.html não encontrado; pulando remoção de script tags legadas.");
    return;
  }
  backup(file);
  let text = normalizeNewlines(read(file));
  const result = removeLegacyScriptTags(text);
  if (result.changed) {
    write(file, result.text.trim() + "\n");
    console.log("[OK] src/controls.html limpo: script tags visuais legadas removidas.");
  } else {
    console.log("[OK] src/controls.html sem script tag visual legada conhecida.");
  }
}

function patchPackageJson() {
  const file = path.join(ROOT, "package.json");
  if (!exists(file)) return;
  backup(file);
  let changed = false;
  let data;
  try {
    data = JSON.parse(read(file));
  } catch (err) {
    console.log(`[AVISO] package.json inválido ou minificado quebrado: ${err.message}`);
    return;
  }
  if (data.version !== "19.8.1-preload-limpo-2026") {
    data.version = "19.8.1-preload-limpo-2026";
    changed = true;
  }
  data.scripts = data.scripts || {};
  if (data.scripts["diagnostico:v19.8.1-preload"] !== "node scripts/diagnostico_v19_8_1_preload_limpo_2026.cjs") {
    data.scripts["diagnostico:v19.8.1-preload"] = "node scripts/diagnostico_v19_8_1_preload_limpo_2026.cjs";
    changed = true;
  }
  if (data.scripts["repair:v19.8.1-preload"] !== "node scripts/repair_v19_8_1_preload_limpo_2026.cjs") {
    data.scripts["repair:v19.8.1-preload"] = "node scripts/repair_v19_8_1_preload_limpo_2026.cjs";
    changed = true;
  }
  if (changed) {
    write(file, JSON.stringify(data, null, 2) + "\n");
    console.log("[OK] package.json atualizado para V19.8.1.");
  } else {
    console.log("[OK] package.json já contém V19.8.1.");
  }
}

function patchMemory() {
  const file = path.join(ROOT, "MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) {
    console.log("[AVISO] MEMORIA_GPT_NOELLE.md não encontrado; pulando nota.");
    return;
  }
  backup(file);
  let text = read(file);
  if (text.includes("V19.8.1 — Preload Limpo")) {
    console.log("[OK] MEMORIA_GPT_NOELLE.md já contém V19.8.1.");
    return;
  }
  text += `\n\n## V19.8.1 — Preload Limpo\n` +
    `- O preload.js deve expor APIs via contextBridge, não injetar UI visual antiga.\n` +
    `- Runtimes visuais V19.3/V19.5 não devem criar botões flutuantes automaticamente na janela principal.\n` +
    `- A aba Avatar final deve ser rota real do renderer principal, não painel injetado por MutationObserver.\n` +
    `- Compatibilidade com noelleRoomV19 pode existir como API, sem botão/painel visual legado.\n`;
  write(file, text);
  console.log("[OK] MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.1.");
}

function main() {
  console.log("================================================================");
  console.log(` Noelle ${VERSION_TAG} - reparo controlado`);
  console.log("================================================================");
  ensureDir(BACKUP_DIR);
  patchPreload();
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  console.log(`[OK] Reparação V19.8.1 concluída. Backup: ${rel(BACKUP_DIR)}`);
  console.log("[INFO] Rode: node scripts\\diagnostico_v19_8_1_preload_limpo_2026.cjs");
}

try {
  main();
} catch (err) {
  console.error("[ERRO] Falha na reparação V19.8.1:", err && err.stack ? err.stack : err);
  process.exit(1);
}
