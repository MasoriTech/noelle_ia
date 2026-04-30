"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = process.cwd();
const VERSION = "19.8.9a-mega-ui-settings-reforco-2026";
const TAG = "V19.8.9a Mega UI/Settings Reforco";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(ROOT, "backups", `v19_8_9a_mega_ui_settings_reforco_${stamp}`);
function rel(...p) { return path.join(ROOT, ...p); }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function read(p, fallback = "") { try { return fs.readFileSync(p, "utf8"); } catch { return fallback; } }
function write(p, data) { ensureDir(path.dirname(p)); fs.writeFileSync(p, data, "utf8"); }
function backup(relative) { const src = rel(relative); if (!exists(src)) return; const dst = path.join(backupDir, relative); ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); console.log(`[OK] Backup: ${relative} -> ${path.relative(ROOT, dst)}`); }
function nodeCheck(relative) { const r = spawnSync(process.execPath, ["--check", rel(relative)], { encoding: "utf8" }); if (r.status !== 0) { console.error(r.stdout || ""); console.error(r.stderr || ""); throw new Error(`node --check falhou: ${relative}`); } console.log(`[OK] node --check ${relative}`); }

function patchControlsHtml() {
  const file = rel("src", "controls.html");
  if (!exists(file)) throw new Error("src/controls.html não encontrado.");
  let html = read(file);

  // Remove runtimes de polish/guard anteriores para não duplicar listeners nem reativar overlay antigo.
  html = html.replace(/\s*<script\b[^>]*src=["'][^"']*(?:noelle_ui_polish_v19_8_9\.js|noelle_ui_polish_v19_8_9a\.js|noelle_avatar_resize_guard_v19_8_3|noelle_avatar_route_guard_v19_8_4|noelle_avatar_overlay_killer_v19_8_5|noelle_avatar_overlay_launcher_killer_v19_8_6)[^"']*["'][^>]*><\/script>\s*/gi, "\n");
  html = html.replace(/\s*<link\b[^>]*href=["'][^"']*(?:noelle_ui_polish_v19_8_9\.css|noelle_ui_polish_v19_8_9a\.css|noelle_avatar_responsive_v19_8_3)[^"']*["'][^>]*>\s*/gi, "\n");

  html = html.replace(/A opção 1 do INICIAR\.bat verifica dependências, TTS\/STT, Ollama, modelo e assets antes de abrir\./g, "A opção 1 do iniciar.bat abre a Noelle sem aplicar reparos. Diagnóstico e manutenção ficam nas outras opções do menu.");
  html = html.replace(/O INICIAR\.bat instala STT\/TTS\. O app usa Piper quando houver voz \.onnx e fallback Windows SAPI quando não houver\./g, "O áudio usa Piper quando houver voz .onnx configurada. Se não houver, usa fallback Windows SAPI. Use Testar TTS para verificar.");
  html = html.replace(/Abrir janela do avatar/g, "Abrir Widget");
  html = html.replace(/Abrir avatar/g, "Abrir Widget");

  const cssTag = '<link rel="stylesheet" href="./styles/noelle_ui_polish_v19_8_9a.css">';
  const jsTag = '<script defer src="./renderer/noelle_ui_polish_v19_8_9a.js"></script>';
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${cssTag}\n</head>`); else html = `${cssTag}\n${html}`;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `  ${jsTag}\n</body>`); else html = `${html}\n${jsTag}\n`;
  write(file, html);
  console.log("[OK] src/controls.html atualizado com reforço V19.8.9a.");
}

function patchPackageJson() {
  const file = rel("package.json");
  if (!exists(file)) { console.log("[AVISO] package.json não encontrado; pulando."); return; }
  let pkg;
  try { pkg = JSON.parse(read(file)); } catch (err) { throw new Error(`package.json inválido: ${err.message}`); }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["diagnostico:v19.8.9a"] = "node scripts/diagnostico_v19_8_9a_mega_ui_settings_reforco_2026.cjs";
  pkg.scripts["repair:v19.8.9a"] = "node scripts/repair_v19_8_9a_mega_ui_settings_reforco_2026.cjs";
  pkg.scripts["status:v19.8.9a"] = "node scripts/status_v19_8_9a_mega_ui_settings_reforco_2026.cjs";
  write(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[OK] package.json version: ${VERSION}`);
}

function patchMemory() {
  const file = rel("MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) { console.log("[AVISO] MEMORIA_GPT_NOELLE.md não encontrado; pulando nota."); return; }
  let md = read(file);
  const note = `\n## ${TAG} — 2026\n- Reforça V19.8.9 antes de aplicar: remove tags antigas V19.8.9 e instala apenas V19.8.9a.\n- Bloqueia com mais força botões flutuantes legados Avatar Lab/Room V19, sem mexer em VRM/VRMA/PNG/GLB.\n- Mantém preload limpo, iniciar.bat único e opção [1] apenas iniciar.\n- Configurações recebe cards úteis de Interface, IA/Ollama, Avatar, Áudio e Sistema.\n`;
  if (!md.includes(TAG)) { md += note; write(file, md); console.log("[OK] MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.9a."); } else console.log("[OK] MEMORIA_GPT_NOELLE.md já contém nota V19.8.9a.");
}

function main() {
  console.log("================================================================");
  console.log(" Noelle V19.8.9a Mega UI/Settings Reforço - reparo controlado");
  console.log("================================================================");
  [
    "src/controls.html", "package.json", "MEMORIA_GPT_NOELLE.md", "iniciar.bat",
    "src/renderer/noelle_ui_polish_v19_8_9.js", "src/renderer/noelle_ui_polish_v19_8_9a.js",
    "src/styles/noelle_ui_polish_v19_8_9.css", "src/styles/noelle_ui_polish_v19_8_9a.css"
  ].forEach(backup);
  nodeCheck("src/renderer/noelle_ui_polish_v19_8_9a.js");
  nodeCheck("scripts/diagnostico_v19_8_9a_mega_ui_settings_reforco_2026.cjs");
  nodeCheck("scripts/status_v19_8_9a_mega_ui_settings_reforco_2026.cjs");
  patchControlsHtml();
  patchPackageJson();
  patchMemory();
  console.log(`[OK] Reforço V19.8.9a aplicado. Backup: ${path.relative(ROOT, backupDir)}`);
}
try { main(); } catch (err) { console.error(`[ERRO] ${err.message}`); process.exit(1); }
