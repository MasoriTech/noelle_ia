#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "backups", `v15_auto_imports_tts_${stamp}`);
const marker = path.join(root, ".noelle_v15_bootstrap.json");

const log = (msg) => console.log(`[Noelle V15] ${msg}`);
const warn = (msg) => console.warn(`[Noelle V15 AVISO] ${msg}`);
const fail = (msg) => { console.error(`[Noelle V15 ERRO] ${msg}`); process.exitCode = 1; };

function exists(p) { return fs.existsSync(p); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function read(p) { return exists(p) ? fs.readFileSync(p, "utf8") : ""; }
function write(p, data) { ensureDir(path.dirname(p)); fs.writeFileSync(p, data, "utf8"); }

function backup(rel) {
  const src = path.join(root, rel);
  if (!exists(src)) return;
  const dst = path.join(backupDir, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function backupMany(list) {
  ensureDir(backupDir);
  for (const rel of list) backup(rel);
}

function run(cmd, cmdArgs, opts = {}) {
  if (!cmd || typeof cmd !== "string") throw new Error("Comando vazio bloqueado para evitar spawn EINVAL.");
  log(`Rodando: ${cmd} ${cmdArgs.join(" ")}`);
  const res = cp.spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: false,
    ...opts,
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`${cmd} saiu com codigo ${res.status}`);
  }
}

function commandOk(cmd, cmdArgs = ["--version"]) {
  try {
    const res = cp.spawnSync(cmd, cmdArgs, { cwd: root, stdio: "ignore", shell: false });
    return !res.error && res.status === 0;
  } catch { return false; }
}

function fixGitignore() {
  backupMany([".gitignore"]);
  const desired = `# Dependencias\nnode_modules/\n\n# Build / release\nrelease/\ndist/\nbuild/\nout/\n\n# Logs\nlogs/\n*.log\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# Backups gerados por packs\nbackups/\n\n# Python / STT / TTS\n.venv/\nvenv/\n__pycache__/\n*.pyc\ntools/noelle_stt/models/\ntools/noelle_stt/cache/\ntools/noelle_stt/tmp/\ntools/noelle_stt/temp/\ntools/noelle_tts/voices/*.onnx\ntools/noelle_tts/voices/*.json\n\n# Temporarios de audio\n*.wav\n*.mp3\n*.m4a\n*.webm\n*.ogg\n\n# Compactados\n*.zip\n*.rar\n*.7z\n\n# Sistema / editor\n.DS_Store\nThumbs.db\n.vscode/\n.idea/\n\n# NAO ignorar assets essenciais da Noelle\n!src/assets/\n!src/assets/expressions/\n!src/assets/motions/\n!src/assets/items/\n!src/assets/avatars/\n!src/assets/Noelle.vrm\n!src/assets/motion_manifest.json\n!src/assets/item_manifest.json\n`;
  write(path.join(root, ".gitignore"), desired);
  log(".gitignore corrigido em linhas separadas e assets protegidos.");
}

function writeRequirements() {
  backupMany(["requirements.txt", "tools/noelle_stt/requirements.txt", "tools/noelle_tts/requirements.txt"]);
  write(path.join(root, "requirements.txt"), `-r tools/noelle_stt/requirements.txt\n-r tools/noelle_tts/requirements.txt\n`);
  write(path.join(root, "tools/noelle_stt/requirements.txt"), `faster-whisper==1.2.1\nctranslate2>=4.7.1,<5\nav>=17.0.1,<18\nhuggingface-hub>=1.12.0,<2\n`);
  write(path.join(root, "tools/noelle_tts/requirements.txt"), `piper-tts==1.4.2\n`);
  log("requirements.txt atualizado com STT + TTS essencial.");
}

function copyPackFiles() {
  const packRoot = __dirname.includes(`${path.sep}scripts`) ? path.resolve(__dirname, "..") : root;
  const copies = [
    ["tools/noelle_tts/speak_piper.py", "tools/noelle_tts/speak_piper.py"],
    ["tools/noelle_tts/README_TTS.md", "tools/noelle_tts/README_TTS.md"],
    ["src/renderer/noelle_assets_bridge_v15.js", "src/renderer/noelle_assets_bridge_v15.js"],
    ["src/styles/noelle_assets_bridge_v15.css", "src/styles/noelle_assets_bridge_v15.css"],
    ["docs/README_V15_AUTO_IMPORTS_TTS.md", "docs/README_V15_AUTO_IMPORTS_TTS.md"],
  ];
  backupMany(copies.map(([, dst]) => dst));
  for (const [srcRel, dstRel] of copies) {
    const src = path.join(packRoot, srcRel);
    const dst = path.join(root, dstRel);
    if (!exists(src)) continue;
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
  log("Arquivos de ponte de assets e TTS copiados.");
}

function safeJsonParse(text, fallback) {
  try {
    if (!text.trim()) return fallback;
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : fallback;
  } catch { return fallback; }
}

function labelForBase(base) {
  const known = {
    happy: "Feliz",
    angry: "Brava",
    sad: "Triste",
    sick: "Passando mal",
    "001_motion_pose": "Pose",
    "002_dogeza": "Dogeza",
    "003_humidai": "Humildade",
    "004_hello_1": "Olá",
    "005_smartphone": "Smartphone",
    "006_drinkwater": "Beber água",
    "007_gekirei": "Elogio",
    "008_gatan": "Surpresa",
  };
  if (known[base]) return known[base];
  return base.replace(/^\d+_?/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function repairManifests() {
  backupMany(["src/assets/expressions/manifest.json", "src/assets/motion_manifest.json", "src/assets/item_manifest.json"]);

  const exprDir = path.join(root, "src", "assets", "expressions");
  ensureDir(exprDir);
  const exprFiles = exists(exprDir) ? fs.readdirSync(exprDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).sort() : [];
  const exprManifestPath = path.join(exprDir, "manifest.json");
  let exprManifest = safeJsonParse(read(exprManifestPath), []);
  if (!exprManifest.length && exprFiles.length) {
    exprManifest = exprFiles.map(file => {
      const id = path.basename(file, path.extname(file)).toLowerCase();
      return { id, label: labelForBase(id), file };
    });
    write(exprManifestPath, JSON.stringify(exprManifest, null, 2));
    log(`Manifest de expressions recriado com ${exprManifest.length} itens.`);
  } else {
    log(`Manifest de expressions preservado com ${exprManifest.length} itens.`);
  }

  const motionsDir = path.join(root, "src", "assets", "motions");
  ensureDir(motionsDir);
  const motionFiles = exists(motionsDir) ? fs.readdirSync(motionsDir).filter(f => /\.vrma$/i.test(f)).sort() : [];
  const motionManifestPath = path.join(root, "src", "assets", "motion_manifest.json");
  let motionManifest = safeJsonParse(read(motionManifestPath), []);
  if (!motionManifest.length && motionFiles.length) {
    motionManifest = motionFiles.map(file => {
      const id = path.basename(file, path.extname(file));
      return { id, label: labelForBase(id), file: `motions/${file}` };
    });
    write(motionManifestPath, JSON.stringify(motionManifest, null, 2));
    log(`Manifest de motions recriado com ${motionManifest.length} itens.`);
  } else {
    log(`Manifest de motions preservado com ${motionManifest.length} itens.`);
  }

  const itemsDir = path.join(root, "src", "assets", "items");
  ensureDir(itemsDir);
  const itemFiles = exists(itemsDir) ? fs.readdirSync(itemsDir).filter(f => /\.(glb|gltf)$/i.test(f)).sort() : [];
  const itemManifestPath = path.join(root, "src", "assets", "item_manifest.json");
  let itemManifest = safeJsonParse(read(itemManifestPath), []);
  if (!itemManifest.length && itemFiles.length) {
    itemManifest = itemFiles.map(file => {
      const id = path.basename(file, path.extname(file));
      return { id, label: labelForBase(id), file: `items/${file}` };
    });
    write(itemManifestPath, JSON.stringify(itemManifest, null, 2));
    log(`Manifest de items recriado com ${itemManifest.length} itens.`);
  } else {
    log(`Manifest de items preservado com ${itemManifest.length} itens.`);
  }
}

function injectIntoControlsHtml() {
  const rel = "src/controls.html";
  const file = path.join(root, rel);
  if (!exists(file)) { warn("src/controls.html não encontrado; pulando injeção visual."); return; }
  backupMany([rel]);
  let html = read(file);
  let changed = false;
  if (!html.includes("noelle_assets_bridge_v15.css")) {
    const link = `\n<link rel="stylesheet" href="./styles/noelle_assets_bridge_v15.css">`;
    html = html.includes("</head>") ? html.replace("</head>", `${link}\n</head>`) : `${link}\n${html}`;
    changed = true;
  }
  if (!html.includes("noelle_assets_bridge_v15.js")) {
    const script = `\n<script src="./renderer/noelle_assets_bridge_v15.js"></script>`;
    html = html.includes("</body>") ? html.replace("</body>", `${script}\n</body>`) : `${html}\n${script}\n`;
    changed = true;
  }
  if (changed) {
    write(file, html);
    log("Ponte visual de assets injetada no controls.html.");
  } else {
    log("Ponte visual de assets já estava injetada.");
  }
}

function patchPreloadTTS() {
  const rel = "preload.js";
  const file = path.join(root, rel);
  if (!exists(file)) { warn("preload.js não encontrado; pulando ponte TTS."); return; }
  backupMany([rel]);
  let js = read(file);
  if (js.includes("NOELLE_V15_TTS_PRELOAD_START")) { log("Ponte TTS no preload já existe."); return; }
  js += `\n\n/* NOELLE_V15_TTS_PRELOAD_START */\ntry {\n  const { contextBridge, ipcRenderer } = require("electron");\n  contextBridge.exposeInMainWorld("noelleTTS", {\n    status: () => ipcRenderer.invoke("noelle-v15:tts-status"),\n    speak: (text) => ipcRenderer.invoke("noelle-v15:tts-speak", { text: String(text || "") })\n  });\n} catch (err) {\n  console.warn("Noelle V15 preload TTS indisponivel", err);\n}\n/* NOELLE_V15_TTS_PRELOAD_END */\n`;
  write(file, js);
  log("Ponte noelleTTS adicionada ao preload.");
}

function patchMainTTS() {
  const rel = "main.js";
  const file = path.join(root, rel);
  if (!exists(file)) { warn("main.js não encontrado; pulando IPC TTS."); return; }
  backupMany([rel]);
  let js = read(file);
  if (js.includes("NOELLE_V15_TTS_MAIN_START")) { log("IPC TTS no main já existe."); return; }
  const block = `\n\n/* NOELLE_V15_TTS_MAIN_START */\ntry {\n  const cpV15 = require("child_process");\n  const pathV15 = require("path");\n  function noelleV15PythonCmd() {\n    const venvPy = pathV15.join(__dirname, ".venv", "Scripts", "python.exe");\n    if (fs.existsSync(venvPy)) return venvPy;\n    return process.platform === "win32" ? "py" : "python3";\n  }\n  function noelleV15RunPython(args) {\n    return new Promise((resolve) => {\n      const py = noelleV15PythonCmd();\n      const finalArgs = py === "py" ? ["-3", ...args] : args;\n      if (!py) return resolve({ ok: false, error: "python vazio" });\n      const child = cpV15.spawn(py, finalArgs, { cwd: __dirname, windowsHide: true });\n      let stdout = ""; let stderr = "";\n      child.stdout.on("data", d => stdout += d.toString());\n      child.stderr.on("data", d => stderr += d.toString());\n      child.on("error", err => resolve({ ok: false, error: err.message }));\n      child.on("close", code => resolve({ ok: code === 0, code, stdout, stderr }));\n    });\n  }\n  function noelleV15RegisterTTS() {\n    try { ipcMain.removeHandler("noelle-v15:tts-status"); } catch {}\n    try { ipcMain.removeHandler("noelle-v15:tts-speak"); } catch {}\n    ipcMain.handle("noelle-v15:tts-status", async () => {\n      return await noelleV15RunPython([pathV15.join("tools", "noelle_tts", "speak_piper.py"), "--status"]);\n    });\n    ipcMain.handle("noelle-v15:tts-speak", async (_event, payload = {}) => {\n      const text = String(payload.text || "").slice(0, 1200);\n      return await noelleV15RunPython([pathV15.join("tools", "noelle_tts", "speak_piper.py"), text || "Olá, eu sou a Noelle."]);\n    });\n  }\n  if (app && app.whenReady) app.whenReady().then(noelleV15RegisterTTS);\n} catch (err) {\n  console.warn("Noelle V15 TTS main indisponivel", err);\n}\n/* NOELLE_V15_TTS_MAIN_END */\n`;
  write(file, `${js}\n${block}`);
  log("IPC de TTS adicionado ao main.js.");
}

function patchPackageJson() {
  const file = path.join(root, "package.json");
  if (!exists(file)) { warn("package.json não encontrado."); return; }
  backupMany(["package.json"]);
  let pkg;
  try { pkg = JSON.parse(read(file)); } catch { warn("package.json inválido; pulando."); return; }
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.start = pkg.scripts.start || "electron .";
  pkg.scripts.diagnostico = pkg.scripts.diagnostico || "node scripts/diagnostico_imports_v15.cjs";
  pkg.scripts["diagnostico:v15"] = "node scripts/diagnostico_imports_v15.cjs";
  pkg.scripts["bootstrap:v15"] = "node scripts/noelle_bootstrap_v15.cjs --auto";
  pkg.devDependencies = pkg.devDependencies || {};
  if (!pkg.devDependencies.electron) pkg.devDependencies.electron = "30.5.1";
  write(file, JSON.stringify(pkg, null, 2));
  log("package.json recebeu scripts V15 sem forçar troca do Electron.");
}

function installNpmIfNeeded(force) {
  if (!exists(path.join(root, "package.json"))) { warn("Sem package.json; pulando npm install."); return; }
  const nodeModules = path.join(root, "node_modules");
  if (!force && exists(nodeModules)) { log("node_modules existe; npm install não necessário agora."); return; }
  if (!commandOk("npm", ["--version"])) { warn("npm não encontrado no PATH."); return; }
  run("npm", ["install"]);
}

function installPythonIfNeeded(force) {
  if (!commandOk("py", ["-3", "--version"]) && !commandOk("python", ["--version"])) {
    warn("Python não encontrado. Instale Python 3.9+ para STT/TTS.");
    return;
  }
  const venvPy = path.join(root, ".venv", "Scripts", "python.exe");
  if (!exists(venvPy)) {
    if (commandOk("py", ["-3", "--version"])) run("py", ["-3", "-m", "venv", ".venv"]);
    else run("python", ["-m", "venv", ".venv"]);
  }
  const py = exists(venvPy) ? venvPy : (commandOk("py", ["-3", "--version"]) ? "py" : "python");
  const pipArgs = py === "py" ? ["-3", "-m", "pip"] : ["-m", "pip"];
  const check = cp.spawnSync(py, [...pipArgs, "show", "piper-tts"], { cwd: root, stdio: "ignore", shell: false });
  if (!force && check.status === 0) { log("piper-tts já instalado; pip install não necessário agora."); return; }
  run(py, [...pipArgs, "install", "--upgrade", "pip"]);
  run(py, [...pipArgs, "install", "-r", "requirements.txt"]);
}

function cleanBats() {
  const dest = path.join(root, "backups", `bats_limpos_${stamp}`);
  ensureDir(dest);
  for (const file of fs.readdirSync(root)) {
    if (!/\.bat$/i.test(file)) continue;
    if (/^iniciar\.bat$/i.test(file)) continue;
    const src = path.join(root, file);
    const dst = path.join(dest, file);
    fs.renameSync(src, dst);
    log(`Movido ${file} -> ${path.relative(root, dst)}`);
  }
}

function saveMarker() {
  write(marker, JSON.stringify({ ok: true, updatedAt: new Date().toISOString(), version: "v15" }, null, 2));
}

async function main() {
  const auto = args.has("--auto");
  const install = args.has("--install");
  const repairOnly = args.has("--repair-only");
  const clean = args.has("--clean-bats");

  if (clean) { cleanBats(); return; }

  backupMany(["main.js", "preload.js", "package.json", "src/controls.html", ".gitignore"]);
  copyPackFiles();
  fixGitignore();
  writeRequirements();
  repairManifests();
  patchPackageJson();
  injectIntoControlsHtml();
  patchPreloadTTS();
  patchMainTTS();

  if (!repairOnly) {
    const force = install;
    installNpmIfNeeded(force || false);
    installPythonIfNeeded(force || false);
  }

  saveMarker();
  log("Bootstrap finalizado.");
  log(`Backup em: ${path.relative(root, backupDir)}`);
}

main().catch((err) => {
  fail(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
