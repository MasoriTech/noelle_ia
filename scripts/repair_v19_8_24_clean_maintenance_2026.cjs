#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.24 — limpeza controlada de manutenção
  - Limpa scripts antigos do package.json e documenta em docs/SCRIPTS_LEGADOS_V19_8_24.md
  - Unifica importAvatar no main/preload com aliases compatíveis
  - Não mexe em UI, Avatar renderer, Room ou Chat
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.24-clean-maintenance-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_24_clean_maintenance_" + STAMP);

const MAIN_BEGIN = "// NOELLE_V19_8_24_IMPORT_AVATAR_MAIN_BEGIN";
const MAIN_END = "// NOELLE_V19_8_24_IMPORT_AVATAR_MAIN_END";
const PRELOAD_BEGIN = "// NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD_BEGIN";
const PRELOAD_END = "// NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD_END";

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function fail(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok("Backup: " + rel);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceBlock(content, begin, end, block) {
  const re = new RegExp(escapeRegExp(begin) + "[\\s\\S]*?" + escapeRegExp(end), "g");
  if (re.test(content)) return content.replace(re, block);
  return content.trimEnd() + "\n\n" + block + "\n";
}

function removeMarkedBlocks(content, markers) {
  let out = content;
  for (const marker of markers) {
    const begin = marker.begin;
    const end = marker.end;
    const re = new RegExp(escapeRegExp(begin) + "[\\s\\S]*?" + escapeRegExp(end) + "\\s*", "g");
    out = out.replace(re, "");
  }
  return out;
}

function buildMainImportAvatarBlock() {
  return [
    MAIN_BEGIN,
    ";(() => {",
    "  try {",
    "    const electron = require(\"electron\");",
    "    const ipcMain = electron.ipcMain;",
    "    const dialog = electron.dialog;",
    "    const app = electron.app;",
    "    const fs = require(\"fs\");",
    "    const path = require(\"path\");",
    "",
    "    if (!ipcMain || !dialog || global.__NOELLE_V19_8_24_IMPORT_AVATAR__) return;",
    "    global.__NOELLE_V19_8_24_IMPORT_AVATAR__ = true;",
    "",
    "    function projectRoot() {",
    "      const candidates = [process.cwd(), app && app.getAppPath ? app.getAppPath() : \"\", __dirname].filter(Boolean);",
    "      for (const candidate of candidates) {",
    "        try {",
    "          if (fs.existsSync(path.join(candidate, \"package.json\")) && fs.existsSync(path.join(candidate, \"src\"))) return candidate;",
    "        } catch (_) {}",
    "      }",
    "      return process.cwd();",
    "    }",
    "",
    "    function safeName(name) {",
    "      return String(name || \"avatar\")",
    "        .normalize(\"NFD\").replace(/[\\\\u0300-\\\\u036f]/g, \"\")",
    "        .replace(/[^a-zA-Z0-9._-]+/g, \"_\")",
    "        .replace(/^_+|_+$/g, \"\")",
    "        .slice(0, 90) || \"avatar\";",
    "    }",
    "",
    "    function readJson(file, fallback) {",
    "      try {",
    "        if (!fs.existsSync(file)) return fallback;",
    "        return JSON.parse(fs.readFileSync(file, \"utf8\"));",
    "      } catch (_) {",
    "        return fallback;",
    "      }",
    "    }",
    "",
    "    function writeManifest(root, relPath, name, ext) {",
    "      const manifestPath = path.join(root, \"src\", \"assets\", \"avatar_manifest.json\");",
    "      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });",
    "      const current = readJson(manifestPath, []);",
    "      const entry = { name: name, path: relPath, file: relPath, type: ext.replace(/^\\\\./, \"\").toUpperCase() };",
    "      let next = current;",
    "",
    "      if (Array.isArray(current)) {",
    "        const useString = current.some((item) => typeof item === \"string\");",
    "        const already = current.some((item) => {",
    "          if (typeof item === \"string\") return item.replace(/\\\\\\\\/g, \"/\") === relPath;",
    "          const p = String(item.path || item.file || item.url || \"\").replace(/\\\\\\\\/g, \"/\");",
    "          return p === relPath;",
    "        });",
    "        if (!already) next = current.concat([useString ? relPath : entry]);",
    "      } else if (current && typeof current === \"object\" && Array.isArray(current.avatars)) {",
    "        const already = current.avatars.some((item) => {",
    "          if (typeof item === \"string\") return item.replace(/\\\\\\\\/g, \"/\") === relPath;",
    "          const p = String(item.path || item.file || item.url || \"\").replace(/\\\\\\\\/g, \"/\");",
    "          return p === relPath;",
    "        });",
    "        if (!already) next = Object.assign({}, current, { avatars: current.avatars.concat([entry]) });",
    "      } else {",
    "        next = [entry];",
    "      }",
    "",
    "      fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + \"\\\\n\", \"utf8\");",
    "      return Array.isArray(next) ? next.length : (Array.isArray(next.avatars) ? next.avatars.length : 1);",
    "    }",
    "",
    "    async function importAvatarHandler() {",
    "      try {",
    "        const chosen = await dialog.showOpenDialog({",
    "          title: \"Adicionar avatar VRM/GLB\",",
    "          properties: [\"openFile\"],",
    "          filters: [{ name: \"Avatares VRM/GLB\", extensions: [\"vrm\", \"glb\"] }]",
    "        });",
    "",
    "        if (chosen.canceled || !chosen.filePaths || !chosen.filePaths[0]) return { ok: true, canceled: true };",
    "",
    "        const source = chosen.filePaths[0];",
    "        const ext = path.extname(source).toLowerCase();",
    "        if (ext !== \".vrm\" && ext !== \".glb\") return { ok: false, error: \"Escolha um arquivo .vrm ou .glb.\" };",
    "",
    "        const root = projectRoot();",
    "        const avatarDir = path.join(root, \"src\", \"assets\", \"avatars\");",
    "        fs.mkdirSync(avatarDir, { recursive: true });",
    "",
    "        const base = safeName(path.basename(source, ext));",
    "        let fileName = base + ext;",
    "        let dest = path.join(avatarDir, fileName);",
    "        let n = 2;",
    "        while (fs.existsSync(dest)) {",
    "          fileName = base + \"_\" + n + ext;",
    "          dest = path.join(avatarDir, fileName);",
    "          n += 1;",
    "        }",
    "",
    "        fs.copyFileSync(source, dest);",
    "        const relFromSrc = path.relative(path.join(root, \"src\"), dest).replace(/\\\\\\\\/g, \"/\");",
    "        const publicRel = \"assets/\" + relFromSrc.replace(/^assets\\//, \"\");",
    "        const count = writeManifest(root, publicRel, base, ext);",
    "",
    "        return { ok: true, canceled: false, name: base, path: publicRel, destination: dest, manifestCount: count };",
    "      } catch (err) {",
    "        return { ok: false, error: err && err.message ? err.message : String(err) };",
    "      }",
    "    }",
    "",
    "    function safeHandle(channel) {",
    "      try { ipcMain.handle(channel, importAvatarHandler); }",
    "      catch (err) {",
    "        const msg = err && err.message ? err.message : String(err);",
    "        if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn(\"[Noelle V19.8.24] IPC importAvatar:\", msg);",
    "      }",
    "    }",
    "",
    "    safeHandle(\"noelle:import-avatar\");",
    "    safeHandle(\"noelle:v19_8_24:import-avatar\");",
    "    safeHandle(\"noelle:v19_8_21:import-avatar\");",
    "    safeHandle(\"noelle:v19_8_20:import-avatar\");",
    "  } catch (err) {",
    "    console.warn(\"[Noelle V19.8.24] Import avatar IPC indisponível:\", err && err.message ? err.message : err);",
    "  }",
    "})();",
    MAIN_END
  ].join("\n");
}

function buildPreloadImportAvatarBlock() {
  return [
    PRELOAD_BEGIN,
    "try {",
    "  const electron = require(\"electron\");",
    "  const contextBridge = electron.contextBridge;",
    "  const ipcRenderer = electron.ipcRenderer;",
    "  if (contextBridge && ipcRenderer && !globalThis.__NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD__) {",
    "    globalThis.__NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD__ = true;",
    "    const importAvatarApi = {",
    "      importAvatar: () => ipcRenderer.invoke(\"noelle:v19_8_24:import-avatar\")",
    "    };",
    "    contextBridge.exposeInMainWorld(\"noelleAvatarImport\", importAvatarApi);",
    "    contextBridge.exposeInMainWorld(\"noelleAvatarImportV19824\", importAvatarApi);",
    "    contextBridge.exposeInMainWorld(\"noelleAvatarImportV19821\", importAvatarApi);",
    "    contextBridge.exposeInMainWorld(\"noelleAvatarImportV19820\", importAvatarApi);",
    "  }",
    "} catch (err) {",
    "  console.warn(\"[Noelle V19.8.24] preload import avatar indisponível:\", err && err.message ? err.message : err);",
    "}",
    PRELOAD_END
  ].join("\n");
}

function patchMainJs() {
  const rel = "main.js";
  if (!exists(rel)) {
    warn("main.js não encontrado; pulando limpeza de importAvatar no main.");
    return;
  }

  backup(rel);
  let code = read(rel);
  code = removeMarkedBlocks(code, [
    { begin: "// NOELLE_V19_8_20_IMPORT_MAIN_BEGIN", end: "// NOELLE_V19_8_20_IMPORT_MAIN_END" },
    { begin: "// NOELLE_V19_8_21_IMPORT_MAIN_BEGIN", end: "// NOELLE_V19_8_21_IMPORT_MAIN_END" },
    { begin: MAIN_BEGIN, end: MAIN_END }
  ]);

  code = replaceBlock(code, MAIN_BEGIN, MAIN_END, buildMainImportAvatarBlock());
  write(rel, code);
  ok("main.js: importAvatar unificado em V19.8.24.");
}

function patchPreloadJs() {
  const rel = "preload.js";
  if (!exists(rel)) {
    warn("preload.js não encontrado; pulando limpeza de importAvatar no preload.");
    return;
  }

  backup(rel);
  let code = read(rel);
  code = removeMarkedBlocks(code, [
    { begin: "// NOELLE_V19_8_20_IMPORT_PRELOAD_BEGIN", end: "// NOELLE_V19_8_20_IMPORT_PRELOAD_END" },
    { begin: "// NOELLE_V19_8_21_IMPORT_PRELOAD_BEGIN", end: "// NOELLE_V19_8_21_IMPORT_PRELOAD_END" },
    { begin: PRELOAD_BEGIN, end: PRELOAD_END }
  ]);

  code = replaceBlock(code, PRELOAD_BEGIN, PRELOAD_END, buildPreloadImportAvatarBlock());
  write(rel, code);
  ok("preload.js: importAvatar unificado em V19.8.24 com aliases V20/V21.");
}

function isLegacyScript(name, cmd) {
  const n = String(name || "");
  const c = String(cmd || "");

  if (["start", "test", "build", "dist", "dist:win", "pack", "check"].includes(n)) return false;
  if (/^build:/i.test(n) && !/v\d+[_\.\-]\d+/i.test(n)) return false;

  return (
    /v\d+[_\.\-]\d+/i.test(n) ||
    /v\d+[_\.\-]\d+/i.test(c) ||
    /^(repair|fix|status):/i.test(n) ||
    /^diagnostico:v\d/i.test(n) ||
    /^diagnóstico:v\d/i.test(n)
  );
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) {
    fail("package.json não encontrado.");
    return;
  }

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    fail("package.json inválido: " + err.message);
    return;
  }

  const originalScripts = Object.assign({}, pkg.scripts || {});
  const kept = {};
  const legacy = {};

  for (const [name, cmd] of Object.entries(originalScripts)) {
    if (isLegacyScript(name, cmd)) legacy[name] = cmd;
    else kept[name] = cmd;
  }

  if (!kept.start) kept.start = "electron .";

  // Preserve best available avatar build command as generic alias.
  if (!kept["build:avatar"]) {
    const avatarBuild = Object.entries(originalScripts).find(([name]) => /^build:avatar/i.test(name));
    if (avatarBuild) kept["build:avatar"] = avatarBuild[1];
  }

  kept.check = "node scripts/diagnostico_v19_8_24_clean_maintenance_2026.cjs";
  kept.diagnostico = "node scripts/diagnostico_v19_8_24_clean_maintenance_2026.cjs";
  kept["diagnostico:main"] = "node scripts/diagnostico_v19_8_24_main_2026.cjs";
  kept["diagnostico:preload"] = "node scripts/diagnostico_v19_8_24_preload_2026.cjs";
  kept["diagnostico:avatar"] = "node scripts/diagnostico_v19_8_24_avatar_2026.cjs";
  kept["repair:v19.8.24-clean"] = "node scripts/repair_v19_8_24_clean_maintenance_2026.cjs";

  pkg.version = VERSION;
  pkg.scripts = kept;

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json limpo: " + Object.keys(legacy).length + " script(s) legado(s) documentado(s).");

  const legacyDoc = [
    "# Scripts legados movidos pelo V19.8.24",
    "",
    "Estes scripts foram removidos do `package.json` para reduzir confusão de manutenção.",
    "Os arquivos físicos não foram apagados. Use este documento apenas como referência.",
    "",
    "Backup completo do `package.json` foi salvo em:",
    "",
    "`" + path.relative(ROOT, path.join(BACKUP_DIR, "package.json")).replace(/\\/g, "/") + "`",
    "",
    "## Scripts legados",
    ""
  ];

  if (!Object.keys(legacy).length) {
    legacyDoc.push("Nenhum script legado detectado.");
  } else {
    for (const [name, cmd] of Object.entries(legacy)) {
      legacyDoc.push("### `" + name + "`");
      legacyDoc.push("");
      legacyDoc.push("```bash");
      legacyDoc.push(cmd);
      legacyDoc.push("```");
      legacyDoc.push("");
    }
  }

  write("docs/SCRIPTS_LEGADOS_V19_8_24.md", legacyDoc.join("\n") + "\n");
  ok("docs/SCRIPTS_LEGADOS_V19_8_24.md atualizado.");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.24 — Clean maintenance")) {
    md += "\n\n## V19.8.24 — Clean maintenance\n\n- Limpeza controlada de manutenção.\n- `package.json` mantém scripts principais e move scripts legados V19.x para `docs/SCRIPTS_LEGADOS_V19_8_24.md`.\n- `main.js` unifica o IPC de adicionar/importar avatar em V19.8.24 com aliases compatíveis V19.8.20/V19.8.21.\n- `preload.js` expõe `noelleAvatarImport`, `noelleAvatarImportV19824`, `noelleAvatarImportV19821` e `noelleAvatarImportV19820` apontando para o canal novo.\n- Não mexe em UI, Avatar renderer, Chat, Room, assets ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.24.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.24 - Clean maintenance");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [
    "scripts/diagnostico_v19_8_24_clean_maintenance_2026.cjs",
    "scripts/diagnostico_v19_8_24_main_2026.cjs",
    "scripts/diagnostico_v19_8_24_preload_2026.cjs",
    "scripts/diagnostico_v19_8_24_avatar_2026.cjs",
    "iniciar.bat"
  ].forEach((rel) => {
    if (exists(rel)) ok(rel + " existe");
    else fail(rel + " não encontrado. Copie o pack inteiro para a raiz.");
  });

  patchPackageJson();
  patchMainJs();
  patchPreloadJs();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.24 terminou com problemas.");
  } else {
    ok("Reparo V19.8.24 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico e inicie pela opção [1].");
  }
}

main();
