"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(
  ROOT,
  "backups",
  "v19_0_1_preload_fix_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)
);

const SAFE_PATCH = "\n// NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN\n(() => {\n  try {\n    const electronForNoelleRoomV19 = require(\"electron\");\n    const bridgeForNoelleRoomV19 = electronForNoelleRoomV19.contextBridge;\n    const ipcForNoelleRoomV19 = electronForNoelleRoomV19.ipcRenderer;\n\n    if (!bridgeForNoelleRoomV19 || !ipcForNoelleRoomV19) return;\n    if (globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__) return;\n\n    globalThis.__NOELLE_ROOM_V19_PRELOAD_EXPOSED__ = true;\n\n    bridgeForNoelleRoomV19.exposeInMainWorld(\"noelleRoomV19\", {\n      open: () => ipcForNoelleRoomV19.invoke(\"room:open\"),\n      listCatalog: () => ipcForNoelleRoomV19.invoke(\"room:catalog\"),\n      loadLayout: () => ipcForNoelleRoomV19.invoke(\"room:load-layout\"),\n      saveLayout: (layout) => ipcForNoelleRoomV19.invoke(\"room:save-layout\", layout)\n    });\n  } catch (err) {\n    try {\n      console.warn(\"[Noelle] noelleRoomV19 preload indispon\u00edvel\", err);\n    } catch {}\n  }\n})();\n// NOELLE_ROOM_V19_PRELOAD_SAFE_END\n";

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8");
}

function write(rel, text) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), text, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(abs(rel), dst);
}

function log(message) {
  console.log(message);
}

function warn(message) {
  console.log("[AVISO] " + message);
}

function fail(message) {
  console.error("[ERRO] " + message);
  process.exitCode = 1;
}

function nodeCheck(rel) {
  if (!exists(rel)) {
    fail(rel + " não encontrado.");
    return false;
  }

  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    fail("node --check falhou: " + rel);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return false;
  }

  log("[OK] node --check " + rel);
  return true;
}

function removeOldRoomV19PreloadBlocks(text) {
  let next = text;

  // Remove bloco antigo do pack V19 que usava:
  // var { contextBridge, ipcRenderer } = require("electron");
  // Isso quebrava preload.js quando o arquivo já tinha const contextBridge/ipcRenderer.
  next = next.replace(
    /\n?try\s*\{\s*if\s*\(typeof contextBridge === "undefined" \|\| typeof ipcRenderer === "undefined"\)\s*\{\s*var\s*\{\s*contextBridge,\s*ipcRenderer\s*\}\s*=\s*require\("electron"\);\s*\}\s*contextBridge\.exposeInMainWorld\("noelleRoomV19"[\s\S]*?console\.warn\("noelleRoomV19 preload indisponível", err\);\s*\}\s*\n?/g,
    "\n"
  );

  // Remove qualquer versão segura anterior para evitar duplicar exposeInMainWorld.
  next = next.replace(
    /\n?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN[\s\S]*?\/\/ NOELLE_ROOM_V19_PRELOAD_SAFE_END\n?/g,
    "\n"
  );

  return next.trimEnd() + "\n";
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) {
    fail("preload.js não encontrado na raiz do projeto.");
    return;
  }

  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  backup(rel);

  let text = read(rel);
  text = removeOldRoomV19PreloadBlocks(text);
  text += "\n" + SAFE_PATCH.trim() + "\n";

  write(rel, text);
  log("[OK] preload.js corrigido com patch seguro V19.0.1.");

  nodeCheck(rel);
}

function patchApplyScript() {
  const rel = "scripts/apply_v19_megalayout_2026.cjs";
  if (!exists(rel)) {
    warn("scripts/apply_v19_megalayout_2026.cjs não encontrado. Pulando correção do apply antigo.");
    return;
  }

  backup(rel);

  let text = read(rel);

  // Atualiza o conteúdo de FILES.preload_patch dentro do apply antigo,
  // para o erro não voltar se você aplicar a V19 de novo.
  if (text.includes('"preload_patch"')) {
    text = text.replace(
      /"preload_patch"\s*:\s*"(?:\\.|[^"\\])*"/,
      '"preload_patch": ' + JSON.stringify("\n" + SAFE_PATCH.trim() + "\n")
    );
  } else {
    warn("Não encontrei FILES.preload_patch no apply antigo.");
  }

  // Garante que o apply antigo não tente deixar o bloco ruim por outro caminho.
  text = text.replace(/var\s*\{\s*contextBridge,\s*ipcRenderer\s*\}\s*=\s*require\("electron"\);/g, "const electronForNoelleRoomV19 = require(\"electron\");");

  write(rel, text);
  log("[OK] apply_v19_megalayout_2026.cjs corrigido para não recriar preload quebrado.");

  nodeCheck(rel);
}

function main() {
  console.log("============================================================");
  console.log(" Noelle V19.0.1 - Fix preload.js");
  console.log("============================================================");

  patchPreload();
  patchApplyScript();

  console.log("");
  if (process.exitCode) {
    console.log("[RESULTADO] Corrigiu parcialmente, mas ainda há erro acima.");
  } else {
    console.log("[OK] preload.js passou no node --check.");
    console.log("[OK] Agora rode novamente o build/diagnóstico da Room V19.");
  }
}

main();
