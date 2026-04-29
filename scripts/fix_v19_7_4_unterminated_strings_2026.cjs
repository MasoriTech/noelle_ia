"use strict";

/*
  Noelle V19.7.4 - Fix Avatar Preview build
  Corrige strings quebradas por \n real dentro de aspas e blinda o top-level await do Avatar Lab/Preview.
*/

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const PATCH = "V19.7.4 avatar preview string/build fix 2026";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(ROOT, "backups", `v19_7_4_avatar_preview_string_fix_2026_${stamp}`);

const filesToBackup = [
  "src/renderer/avatar_lab_v19_6_app.js",
  "scripts/build_avatar_lab_v19_6_2026.cjs",
  "scripts/apply_v19_6_avatar_lab_isolated_2026.cjs",
  "scripts/apply_v19_7_2_avatar_focus_carousel_2026.cjs",
  "package.json",
  "MEMORIA_GPT_NOELLE.md",
  "iniciar.bat",
];

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.warn(`[AVISO] ${msg}`); }
function fail(msg) { console.error(`[ERRO] ${msg}`); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function write(rel, text) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, "utf8");
}

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function backupAll() {
  fs.mkdirSync(backupRoot, { recursive: true });
  for (const rel of filesToBackup) backup(rel);
  ok(`Backup criado em ${path.relative(ROOT, backupRoot)}`);
}

function repairLiteralNewlinesInsideQuotedStrings(source) {
  let out = "";
  let state = "normal";
  let quote = "";
  let changed = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (state === "normal") {
      if (ch === "'" || ch === '"') {
        state = "quote";
        quote = ch;
        out += ch;
      } else if (ch === "`") {
        state = "template";
        out += ch;
      } else if (ch === "/" && next === "/") {
        state = "lineComment";
        out += ch + next;
        i++;
      } else if (ch === "/" && next === "*") {
        state = "blockComment";
        out += ch + next;
        i++;
      } else {
        out += ch;
      }
      continue;
    }

    if (state === "lineComment") {
      out += ch;
      if (ch === "\n") state = "normal";
      continue;
    }

    if (state === "blockComment") {
      out += ch;
      if (ch === "*" && next === "/") {
        out += next;
        i++;
        state = "normal";
      }
      continue;
    }

    if (state === "template") {
      out += ch;
      if (ch === "\\") {
        if (i + 1 < source.length) {
          out += source[i + 1];
          i++;
        }
      } else if (ch === "`") {
        state = "normal";
      }
      continue;
    }

    if (state === "quote") {
      if (ch === "\r") {
        if (next === "\n") i++;
        out += "\\n";
        changed = true;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        changed = true;
        continue;
      }
      out += ch;
      if (ch === "\\") {
        if (i + 1 < source.length) {
          out += source[i + 1];
          i++;
        }
      } else if (ch === quote) {
        state = "normal";
        quote = "";
      }
      continue;
    }
  }

  return { text: out, changed };
}

function fixTopLevelAwaitInAvatarApp() {
  const rel = "src/renderer/avatar_lab_v19_6_app.js";
  if (!exists(rel)) {
    warn(`${rel} não encontrado; pulando fix do Avatar Preview.`);
    return false;
  }

  let src = read(rel);
  const before = src;

  const repaired = repairLiteralNewlinesInsideQuotedStrings(src);
  src = repaired.text;

  const hasTopLevelMotionAwait = /(^|[;\n\r])\s*await\s+loadMotionManifest\s*\(\s*\)\s*;/.test(src);
  const alreadyBooted = /function\s+bootAvatarLabV196\s*\(/.test(src) || /function\s+bootAvatarPreviewV197\s*\(/.test(src);

  if (hasTopLevelMotionAwait && !alreadyBooted) {
    const idx = src.lastIndexOf("await loadMotionManifest();");
    if (idx >= 0) {
      const suffix = `\nasync function bootAvatarLabV196() {\n  try {\n    await loadMotionManifest();\n  } catch (err) {\n    console.error(err);\n    setStatus(\`Falha ao carregar motions: \${err.message}\`, "warn");\n    log(err.stack || err.message);\n  }\n\n  try {\n    await loadAvatar(els.avatarSelect.value, els.avatarSelect.value);\n  } catch (err) {\n    console.error(err);\n    setStatus(\`Falha ao carregar avatar por caminho: \${err.message}.\\nUse arquivo local.\`, "danger");\n    log(err.stack || err.message);\n  }\n\n  resetCamera();\n  animate();\n}\n\nvoid bootAvatarLabV196();\n`;
      src = src.slice(0, idx) + suffix;
      ok("Top-level await antigo encapsulado em bootAvatarLabV196().");
    }
  } else if (hasTopLevelMotionAwait && alreadyBooted) {
    warn("Arquivo já tem boot function, mas ainda possui await solto; mantendo correção conservadora de strings.");
  }

  // Correção pontual para variações geradas por patches anteriores.
  src = src.replace(/els\.debug\.textContent\s*=\s*\(line\s*\+\s*"\\n"\s*\+\s*\(els\.debug\.textContent\s*\|\|\s*""\)\)\.slice\(0,\s*6000\);/g,
    'els.debug.textContent = (line + "\\n" + (els.debug.textContent || "")).slice(0, 6000);');

  if (src !== before) {
    write(rel, src);
    ok(`Atualizado: ${rel}`);
    return true;
  }
  ok(`${rel} já estava sem strings quebradas detectáveis.`);
  return false;
}

function writeRobustBuildScript() {
  const rel = "scripts/build_avatar_lab_v19_6_2026.cjs";
  const text = `"use strict";\n\nconst fs = require("fs");\nconst path = require("path");\nconst cp = require("child_process");\n\nconst ROOT = process.cwd();\n\nfunction runAutoFix() {\n  const fixScript = path.join(ROOT, "scripts", "fix_v19_7_4_unterminated_strings_2026.cjs");\n  if (!fs.existsSync(fixScript)) return;\n  if (process.env.NOELLE_SKIP_AVATAR_AUTOFIX === "1") return;\n\n  const res = cp.spawnSync(process.execPath, [fixScript, "--from-build"], {\n    cwd: ROOT,\n    stdio: "inherit",\n    env: { ...process.env, NOELLE_SKIP_AVATAR_AUTOFIX: "1" },\n  });\n  if (res.status !== 0) {\n    throw new Error("Auto-fix V19.7.4 falhou antes do build.");\n  }\n}\n\nasync function main() {\n  runAutoFix();\n\n  let esbuild;\n  try {\n    esbuild = require("esbuild");\n  } catch {\n    console.error("[ERRO] esbuild não encontrado. Rode: npm install");\n    process.exit(1);\n  }\n\n  const entry = path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js");\n  const outdir = path.join(ROOT, "src", "renderer_dist");\n  const outfile = path.join(outdir, "avatar_lab_v19_6.bundle.js");\n\n  if (!fs.existsSync(entry)) {\n    console.error("[ERRO] Entrada não encontrada:", entry);\n    process.exit(1);\n  }\n\n  fs.mkdirSync(outdir, { recursive: true });\n\n  await esbuild.build({\n    entryPoints: [entry],\n    outfile,\n    bundle: true,\n    format: "iife",\n    platform: "browser",\n    target: ["chrome120"],\n    sourcemap: true,\n    logLevel: "info",\n  });\n\n  console.log("[OK] Bundle Avatar Preview gerado:", path.relative(ROOT, outfile));\n}\n\nmain().catch((err) => {\n  console.error("[ERRO] Build Avatar Preview falhou:", err.message || err);\n  process.exit(1);\n});\n`;
  write(rel, text);
  ok(`Atualizado: ${rel}`);
}

function repairRelatedGeneratedScripts() {
  const candidates = [
    "scripts/apply_v19_6_avatar_lab_isolated_2026.cjs",
    "scripts/apply_v19_7_2_avatar_focus_carousel_2026.cjs",
    "scripts/apply_v19_7_3_build_regex_2026.cjs",
  ];
  for (const rel of candidates) {
    if (!exists(rel)) continue;
    const src = read(rel);
    const repaired = repairLiteralNewlinesInsideQuotedStrings(src);
    let out = repaired.text;
    // Evita que templates antigos deixem await solto quando regravarem o app.
    out = out.replace(/await loadMotionManifest\(\);\s*await loadAvatar/g, "await loadMotionManifest(); await loadAvatar");
    if (out !== src) {
      write(rel, out);
      ok(`Reparado gerador/aplicador: ${rel}`);
    }
  }
}

function updatePackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return warn("package.json não encontrado; pulando scripts npm.");
  let pkg;
  try { pkg = JSON.parse(read(rel)); } catch (err) { return warn(`package.json inválido: ${err.message}`); }
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["build:avatar-lab-v19.6"] = "node scripts/build_avatar_lab_v19_6_2026.cjs";
  pkg.scripts["fix:v19.7.4-avatar-preview"] = "node scripts/fix_v19_7_4_unterminated_strings_2026.cjs";
  pkg.scripts["diagnostico:v19.7.4"] = "node scripts/diagnostico_v19_7_4_avatar_preview_2026.cjs";
  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado.");
}

function appendMemoryNote() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let txt = read(rel);
  if (txt.includes("V19.7.4")) {
    ok("MEMORIA_GPT_NOELLE.md já contém V19.7.4.");
    return;
  }
  txt += `\n\n---\n\n## Nota V19.7.4 - Avatar Preview robusto\n\n- O Avatar Preview/Avatar Lab deve compilar em build IIFE sem top-level await.\n- Strings com quebra de linha real dentro de aspas simples/duplas devem ser corrigidas para \\n escapado.\n- A aba Avatar deve manter foco visual no personagem: preview grande, setas embaixo e opções ao lado.\n- O iniciar.bat deve rodar correção/diagnóstico antes de iniciar para evitar regressões antigas.\n`;
  write(rel, txt);
  ok("MEMORIA_GPT_NOELLE.md atualizado com V19.7.4.");
}

function runNodeCheck(rel) {
  if (!exists(rel)) return true;
  const res = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { cwd: ROOT, encoding: "utf8" });
  if (res.status !== 0) {
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    fail(`node --check falhou: ${rel}`);
    return false;
  }
  ok(`node --check ${rel}`);
  return true;
}

function main() {
  const fromBuild = process.argv.includes("--from-build");
  log(`================================================================`);
  log(` Noelle ${PATCH}`);
  log(`================================================================`);

  if (!fromBuild) backupAll();

  fixTopLevelAwaitInAvatarApp();
  writeRobustBuildScript();
  repairRelatedGeneratedScripts();
  updatePackageJson();
  appendMemoryNote();

  runNodeCheck("src/renderer/avatar_lab_v19_6_app.js");
  runNodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
  runNodeCheck("scripts/fix_v19_7_4_unterminated_strings_2026.cjs");

  if (process.exitCode) {
    log("[ERRO] Correção V19.7.4 terminou com falhas.");
    process.exit(process.exitCode);
  }
  ok("Correção V19.7.4 aplicada.");
}

main();
