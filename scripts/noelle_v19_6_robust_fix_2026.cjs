"use strict";

/*
 Noelle IA — V19.6.1 Robust Fix 2026
 Correções cirúrgicas baseadas em MEMORIA_GPT_NOELLE.md.
 Não substitui o projeto inteiro. Faz backup antes de alterar.
*/

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply") || process.argv.includes("/apply");
const NOW = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
const BACKUP_ROOT = path.join(ROOT, "backups", `v19_6_1_robust_fix_2026_${NOW}`);

const touched = [];
const warnings = [];
const errors = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function abs(...parts) {
  return path.join(ROOT, ...parts);
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function backup(file) {
  if (!exists(file)) return;
  const dest = path.join(BACKUP_ROOT, rel(file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

function saveIfChanged(file, nextText, reason) {
  const oldText = exists(file) ? read(file) : "";
  if (oldText === nextText) return false;
  if (!APPLY) {
    console.log(`[DRY] alteraria ${rel(file)} — ${reason}`);
    return true;
  }
  backup(file);
  write(file, nextText);
  touched.push(rel(file));
  console.log(`[OK] ${rel(file)} — ${reason}`);
  return true;
}

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    warnings.push(`Não encontrei bloco exato para: ${label}`);
    return text;
  }
  return text.replace(from, to);
}

function ensurePackageScript(pkg, name, value) {
  pkg.scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  if (pkg.scripts[name] !== value) pkg.scripts[name] = value;
}

function patchAvatarLabApp() {
  const file = abs("src", "renderer", "avatar_lab_v19_6_app.js");
  if (!exists(file)) {
    warnings.push("src/renderer/avatar_lab_v19_6_app.js não encontrado; pulei fix do Avatar Lab.");
    return;
  }

  let text = read(file).replace(/\r\n/g, "\n");
  let next = text;

  // 1) Corrige o erro real: top-level await + esbuild format:iife.
  if (!next.includes("bootAvatarLabV196")) {
    const oldBoot = `await loadMotionManifest();\nawait loadAvatar(els.avatarSelect.value, els.avatarSelect.value).catch((err) => {\n console.error(err);\n setStatus(\`Falha ao carregar avatar por caminho: \${err.message}.\nUse arquivo local.\`, "danger");\n log(err.stack || err.message);\n});\n\nresetCamera();\nanimate();`;

    const newBoot = `async function bootAvatarLabV196() {\n try {\n  await loadMotionManifest();\n  const defaultAvatar = els.avatarSelect?.value || "./assets/Noelle.vrm";\n  await loadAvatar(defaultAvatar, defaultAvatar).catch((err) => {\n   console.error(err);\n   setStatus(\`Falha ao carregar avatar por caminho: \${err.message}.\\nUse arquivo local.\`, "danger");\n   log(err.stack || err.message);\n  });\n  resetCamera();\n  startAnimationLoop();\n } catch (err) {\n  console.error(err);\n  setStatus(\`Avatar Lab não iniciou: \${err?.message || err}\`, "danger");\n  log(err?.stack || err?.message || String(err));\n }\n}\n\nvoid bootAvatarLabV196();`;

    if (next.includes(oldBoot)) {
      next = next.replace(oldBoot, newBoot);
    } else {
      // Fallback menos rígido para arquivos minificados/formatados de outro jeito.
      const rx = /await\s+loadMotionManifest\s*\(\s*\)\s*;\s*await\s+loadAvatar\s*\([\s\S]*?\)\s*\.catch\s*\([\s\S]*?\}\s*\)\s*;\s*resetCamera\s*\(\s*\)\s*;\s*animate\s*\(\s*\)\s*;?\s*$/m;
      if (rx.test(next)) {
        next = next.replace(rx, newBoot + "\n");
      } else if (/^\s*await\s+loadMotionManifest\s*\(\s*\)\s*;/m.test(next)) {
        errors.push("Encontrei await loadMotionManifest, mas não consegui trocar o bloco de inicialização com segurança.");
      }
    }
  }

  // 2) Evita loop duplicado caso o script seja recarregado/injetado mais de uma vez.
  if (next.includes("objectUrls: []") && !next.includes("animationStarted")) {
    next = next.replace("objectUrls: []", "objectUrls: [],\n animationStarted: false");
  }
  if (!next.includes("function startAnimationLoop()")) {
    const marker = "function animate() {";
    if (next.includes(marker)) {
      next = next.replace(marker, `function startAnimationLoop() {\n if (state.animationStarted) return;\n state.animationStarted = true;\n requestAnimationFrame(animate);\n}\n\n${marker}`);
    }
  }
  next = next.replace(/\n\s*requestAnimationFrame\(animate\);\s*\n\}/, "\n requestAnimationFrame(animate);\n}");

  // 3) Logs e UI não devem derrubar o app se um elemento estiver ausente.
  next = next.replace(
    "els.debug.textContent = `${line}\\n${els.debug.textContent || \"\"}`.slice(0, 6000);",
    "if (els.debug) els.debug.textContent = `${line}\\n${els.debug.textContent || \"\"}`.slice(0, 6000);"
  );
  next = next.replace(
    "els.statusPill.textContent = text;\n els.statusPill.className = `pill ${type}`;",
    "if (els.statusPill) {\n  els.statusPill.textContent = text;\n  els.statusPill.className = `pill ${type}`;\n }"
  );
  next = next.replace(
    "els.overlay.innerHTML = \"\";",
    "if (!els.overlay) return;\n els.overlay.innerHTML = \"\";"
  );
  next = next.replace(
    "els.syncPill.textContent = `Room sync: ${type}`;\n els.syncPill.className = \"pill ok\";",
    "if (els.syncPill) {\n  els.syncPill.textContent = `Room sync: ${type}`;\n  els.syncPill.className = \"pill ok\";\n }"
  );

  // 4) Event listeners com optional chaining para a janela não quebrar por HTML parcial.
  const listenerTargets = [
    "btnLoad", "localFile", "avatarSelect", "btnResetCamera", "zoomRange", "btnIdle", "btnBlink",
    "btnHappy", "btnNeutral", "btnPlayMotion", "btnStopMotion", "btnSyncRoom", "btnCopyReport"
  ];
  for (const target of listenerTargets) {
    next = next.replaceAll(`els.${target}.addEventListener`, `els.${target}?.addEventListener`);
  }

  // 5) Canvas é obrigatório, mas a mensagem agora fica clara.
  if (!next.includes("assertAvatarLabRequiredEls")) {
    const afterEls = "};\n\nconst state =";
    const guard = `};\n\nfunction assertAvatarLabRequiredEls() {\n const required = ["canvas", "statusPill", "debug", "avatarSelect", "motionSelect"];\n const missing = required.filter((key) => !els[key]);\n if (missing.length) {\n  throw new Error("Avatar Lab V19.6 HTML incompleto. Elementos ausentes: " + missing.join(", "));\n }\n}\n\nassertAvatarLabRequiredEls();\n\nconst state =`;
    if (next.includes(afterEls)) next = next.replace(afterEls, guard);
  }

  saveIfChanged(file, next, "corrige top-level await/iife e adiciona guardas do Avatar Lab");
}

function patchBuildScript() {
  const file = abs("scripts", "build_avatar_lab_v19_6_2026.cjs");
  if (!exists(file)) {
    warnings.push("scripts/build_avatar_lab_v19_6_2026.cjs não encontrado; pulei reforço do build.");
    return;
  }

  const robust = `"use strict";\n\nconst fs = require("fs");\nconst path = require("path");\n\nconst ROOT = process.cwd();\n\nfunction fail(message) {\n console.error("[ERRO] " + message);\n process.exit(1);\n}\n\nasync function main() {\n let esbuild;\n try {\n  esbuild = require("esbuild");\n } catch {\n  fail("esbuild não encontrado. Rode: npm install");\n }\n\n const entry = path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js");\n const outdir = path.join(ROOT, "src", "renderer_dist");\n const outfile = path.join(outdir, "avatar_lab_v19_6.bundle.js");\n\n if (!fs.existsSync(entry)) fail("Entrada não encontrada: " + path.relative(ROOT, entry));\n\n const source = fs.readFileSync(entry, "utf8");\n if (source.includes("await loadMotionManifest();") && !source.includes("bootAvatarLabV196")) {\n  fail("avatar_lab_v19_6_app.js ainda tem top-level await. Rode: node scripts/noelle_v19_6_robust_fix_2026.cjs --apply");\n }\n\n fs.mkdirSync(outdir, { recursive: true });\n\n await esbuild.build({\n  entryPoints: [entry],\n  outfile,\n  bundle: true,\n  format: "iife",\n  globalName: "NoelleAvatarLabV196Bundle",\n  platform: "browser",\n  target: ["chrome120"],\n  sourcemap: true,\n  legalComments: "none",\n  logLevel: "info"\n });\n\n console.log("[OK] Bundle Avatar Lab V19.6 gerado:", path.relative(ROOT, outfile));\n}\n\nmain().catch((err) => {\n console.error(err);\n process.exit(1);\n});\n`;

  saveIfChanged(file, robust, "build V19.6 mais claro e protegido contra top-level await em IIFE");
}

function patchPackageJson() {
  const file = abs("package.json");
  if (!exists(file)) {
    warnings.push("package.json não encontrado; pulei scripts npm.");
    return;
  }

  let pkg;
  try {
    pkg = JSON.parse(read(file));
  } catch (err) {
    errors.push("package.json inválido: " + err.message);
    return;
  }

  ensurePackageScript(pkg, "fix:v19.6-robusto", "node scripts/noelle_v19_6_robust_fix_2026.cjs --apply");
  ensurePackageScript(pkg, "diagnostico:robusto", "node scripts/diagnostico_noelle_robusto_v19_6_2026.cjs");
  ensurePackageScript(pkg, "check:robusto", "node scripts/diagnostico_noelle_robusto_v19_6_2026.cjs");

  // Não troca versões agressivamente. Só garante dependências declaradas para Avatar Lab real.
  pkg.dependencies = pkg.dependencies && typeof pkg.dependencies === "object" ? pkg.dependencies : {};
  pkg.devDependencies = pkg.devDependencies && typeof pkg.devDependencies === "object" ? pkg.devDependencies : {};
  if (!pkg.dependencies.three) pkg.dependencies.three = "0.184.0";
  if (!pkg.dependencies["@pixiv/three-vrm"]) pkg.dependencies["@pixiv/three-vrm"] = "3.5.2";
  if (!pkg.dependencies["@pixiv/three-vrm-animation"]) pkg.dependencies["@pixiv/three-vrm-animation"] = "3.5.2";
  if (!pkg.devDependencies.esbuild) pkg.devDependencies.esbuild = "0.28.0";

  saveIfChanged(file, JSON.stringify(pkg, null, 2) + "\n", "adiciona scripts de fix/diagnóstico robusto sem trocar stack agressivamente");
}

function patchMemory() {
  const file = abs("MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) {
    warnings.push("MEMORIA_GPT_NOELLE.md não encontrado; não adicionei nota V19.6.1.");
    return;
  }
  let text = read(file).replace(/\r\n/g, "\n");
  if (text.includes("V19.6.1 Robust Fix")) return;
  const section = `\n\n## V19.6.1 Robust Fix — 2026\n\nCorreção de estabilidade baseada na regra de ouro da memória: corrigir uma parte sem quebrar Chat IA, avatar/widget, emotes VRMA, expressions PNG, items GLB, Room e bandeja.\n\nMudanças principais:\n- Corrigido o erro de build do Avatar Lab V19.6: top-level await não é compatível com esbuild \`format: \"iife\"\`.\n- Inicialização do Avatar Lab movida para \`bootAvatarLabV196()\`.\n- Build \`scripts/build_avatar_lab_v19_6_2026.cjs\` agora mostra erro claro se o arquivo voltar com top-level await.\n- Diagnóstico robusto adicionado em \`scripts/diagnostico_noelle_robusto_v19_6_2026.cjs\`.\n- Alterações são cirúrgicas e criam backup em \`backups/\` antes de mexer.\n\nNão fazer regressão:\n- Não substituir \`src/avatar_view.html\` por placeholder.\n- Não remover manifests/assets VRM/VRMA/PNG/GLB.\n- Não remover APIs \`window.noelleAPI\` e \`window.desktopWidget\`.\n- Não remover bandeja do sistema no \`main.js\`.\n`;
  saveIfChanged(file, text + section, "registra V19.6.1 na memória do projeto");
}

function patchGitIgnore() {
  const file = abs(".gitignore");
  const wanted = [
    "node_modules/",
    "release/",
    "dist/",
    "build/",
    "out/",
    "logs/",
    "backups/",
    ".venv/",
    "venv/",
    "__pycache__/",
    "*.pyc",
    "*.log",
    "*.zip",
    "*.rar",
    "*.7z",
    ".noelle_*bootstrap*.json",
    ".noelle_*state*.json",
    "!src/assets/",
    "!src/assets/Noelle.vrm",
    "!src/assets/avatars/",
    "!src/assets/motions/",
    "!src/assets/expressions/",
    "!src/assets/items/",
    "!src/assets/motion_manifest.json",
    "!src/assets/item_manifest.json",
    "!src/assets/expressions/manifest.json"
  ];
  let text = exists(file) ? read(file).replace(/\r\n/g, "\n") : "";
  let next = text.trimEnd();
  for (const line of wanted) {
    if (!new RegExp(`(^|\\n)${line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\n|$)`).test(next)) {
      next += (next ? "\n" : "") + line;
    }
  }
  saveIfChanged(file, next + "\n", "reforça ignores sem bloquear assets críticos");
}

function writeDiagnosticsScript() {
  const src = path.join(__dirname, "diagnostico_noelle_robusto_v19_6_2026.cjs");
  const dst = abs("scripts", "diagnostico_noelle_robusto_v19_6_2026.cjs");
  if (!exists(src)) {
    warnings.push("diagnostico_noelle_robusto_v19_6_2026.cjs não está junto do fix; pulei cópia.");
    return;
  }
  saveIfChanged(dst, read(src), "instala diagnóstico robusto V19.6.1");
}

function runNodeCheck(relPath) {
  const file = abs(...relPath.split("/"));
  if (!exists(file)) return;
  const r = cp.spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status === 0) console.log(`[OK] node --check ${relPath}`);
  else {
    errors.push(`node --check falhou: ${relPath}\n${r.stderr || r.stdout || ""}`);
  }
}

function main() {
  console.log("============================================================");
  console.log(" Noelle IA — V19.6.1 Robust Fix 2026");
  console.log("============================================================");
  console.log(APPLY ? "Modo: APLICAR" : "Modo: SIMULAÇÃO. Use --apply para alterar.");

  if (!exists(abs("package.json"))) errors.push("Execute na raiz do repositório noelle_ia, onde existe package.json.");
  if (!exists(abs("MEMORIA_GPT_NOELLE.md"))) warnings.push("MEMORIA_GPT_NOELLE.md não foi encontrado na raiz.");

  if (!errors.length) {
    if (APPLY) fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    writeDiagnosticsScript();
    patchAvatarLabApp();
    patchBuildScript();
    patchPackageJson();
    patchMemory();
    patchGitIgnore();
  }

  if (APPLY && touched.length) {
    runNodeCheck("scripts/noelle_v19_6_robust_fix_2026.cjs");
    runNodeCheck("scripts/diagnostico_noelle_robusto_v19_6_2026.cjs");
    runNodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
    runNodeCheck("src/renderer/avatar_lab_v19_6_app.js");
  }

  console.log("============================================================");
  if (warnings.length) {
    console.log("[AVISOS]");
    for (const w of warnings) console.log("- " + w);
  }
  if (errors.length) {
    console.log("[ERROS]");
    for (const e of errors) console.log("- " + e);
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] Correção concluída. Arquivos alterados: ${touched.length}`);
  if (APPLY) console.log(`[OK] Backup: ${path.relative(ROOT, BACKUP_ROOT)}`);
  console.log("Próximo teste recomendado: npm run build:avatar-lab-v19.6 && npm run diagnostico:robusto");
}

main();
