"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const root = process.cwd();
let errors = 0;
let warnings = 0;

function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { warnings += 1; console.log("[AVISO] " + msg); }
function fail(msg) { errors += 1; console.log("[ERRO] " + msg); }
function has(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), "utf8") : ""; }

function checkRequiredFiles() {
  console.log("\n== Arquivos principais ==");
  [
    "package.json",
    "main.js",
    "preload.js",
    "src/controls.html",
    "src/styles/noelle.css",
    "src/renderer/controls_window_app.js",
    "src/assets/expressions/manifest.json",
    "requirements.txt",
    "tools/noelle_stt/requirements.txt",
  ].forEach((rel) => has(rel) ? ok(rel) : fail(`${rel} ausente`));
}

function checkPackage() {
  console.log("\n== package.json ==");
  try {
    const pkg = JSON.parse(read("package.json"));
    const electron = pkg.devDependencies?.electron;
    const builder = pkg.devDependencies?.["electron-builder"];
    if (electron === "41.3.0") ok("Electron fixado em 41.3.0"); else warn(`Electron atual no package: ${electron || "ausente"}`);
    if (builder === "26.8.1") ok("electron-builder fixado em 26.8.1"); else warn(`electron-builder atual no package: ${builder || "ausente"}`);
    if (pkg.scripts?.start) ok("script start existe"); else fail("script start ausente");
    if (pkg.scripts?.doctor || pkg.scripts?.diagnostico) ok("script de diagnóstico existe"); else warn("script de diagnóstico ausente");
  } catch (err) {
    fail("package.json inválido: " + err.message);
  }
}

function checkSyntax() {
  console.log("\n== Sintaxe JavaScript ==");
  const files = ["main.js", "preload.js", "src/renderer/controls_window_app.js", "scripts/noelle_apply_v14.cjs", "scripts/noelle_doctor_v14.cjs"];
  for (const rel of files) {
    if (!has(rel)) continue;
    try {
      execFileSync(process.execPath, ["--check", path.join(root, rel)], { stdio: "pipe" });
      ok(`node --check ${rel}`);
    } catch (err) {
      fail(`Erro de sintaxe em ${rel}: ${String(err.stderr || err.message).slice(0, 500)}`);
    }
  }
}

function checkArchitecture() {
  console.log("\n== Arquitetura Electron/UI ==");
  const main = read("main.js");
  const preload = read("preload.js");
  const html = read("src/controls.html");
  const js = read("src/renderer/controls_window_app.js");
  const css = read("src/styles/noelle.css");

  if (/titleBarOverlay/i.test(main)) fail("titleBarOverlay ainda aparece no main.js"); else ok("sem titleBarOverlay");
  if (/frame:\s*true/.test(main)) ok("frame nativo habilitado"); else warn("frame:true não encontrado");
  if (/sandbox:\s*true/.test(main)) ok("sandbox:true no renderer"); else warn("sandbox:true não encontrado");
  if (/nodeIntegration:\s*false/.test(main)) ok("nodeIntegration:false"); else warn("nodeIntegration:false não encontrado");
  if (/contextIsolation:\s*true/.test(main)) ok("contextIsolation:true"); else warn("contextIsolation:true não encontrado");
  if (/noelleAPI/.test(preload) && /desktopWidget/.test(preload)) ok("preload expõe noelleAPI + desktopWidget"); else fail("preload não expõe as duas APIs");
  if (/expressionGrid/.test(html) && /listExpressions/.test(js)) ok("UI de expressões conectada"); else fail("UI de expressões não conectada");
  if (/grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto\s+auto/.test(css)) ok("chat usa grid seguro"); else warn("grid seguro do chat não confirmado");
}

function checkExpressions() {
  console.log("\n== Expressões ==");
  const dir = path.join(root, "src", "assets", "expressions");
  const manifestFile = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestFile)) return fail("manifest de expressões ausente");
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    if (!Array.isArray(manifest) || manifest.length === 0) return fail("manifest de expressões vazio");
    ok(`${manifest.length} expressões no manifest`);
    for (const item of manifest) {
      const file = String(item.file || "");
      if (!file) { warn("expressão sem file no manifest"); continue; }
      const exists = fs.existsSync(path.join(dir, file));
      if (exists) ok(`PNG encontrado: ${file}`); else warn(`PNG ausente: ${file}`);
    }
  } catch (err) {
    fail("manifest de expressões inválido: " + err.message);
  }
}

function checkRequirements() {
  console.log("\n== Python/STT ==");
  const rootReq = read("requirements.txt");
  const sttReq = read("tools/noelle_stt/requirements.txt");
  if (rootReq.includes("tools/noelle_stt/requirements.txt")) ok("requirements.txt aponta para STT"); else warn("requirements.txt da raiz não aponta para STT");
  ["faster-whisper==1.2.1", "ctranslate2", "av", "huggingface-hub"].forEach((dep) => {
    if (sttReq.includes(dep)) ok(`STT contém ${dep}`); else warn(`STT não contém ${dep}`);
  });
}

function checkBats() {
  console.log("\n== BATs na raiz ==");
  const bats = fs.readdirSync(root).filter((name) => /\.bat$/i.test(name));
  if (bats.length <= 1) ok(`Apenas ${bats.length} .bat na raiz`);
  else warn(`Existem ${bats.length} .bat na raiz: ${bats.join(", ")}. Use a opção de limpeza no INICIAR.bat.`);
}

function checkOllama() {
  console.log("\n== Ollama ==");
  return new Promise((resolve) => {
    const req = http.request({ hostname: "127.0.0.1", port: 11434, path: "/api/tags", method: "GET", timeout: 2500 }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          ok("Ollama respondeu em 127.0.0.1:11434");
          if (/qwen3:0\.6b/.test(data)) ok("qwen3:0.6b aparece na lista");
          else warn("Ollama online, mas qwen3:0.6b não apareceu na lista");
        } else warn("Ollama respondeu com HTTP " + res.statusCode);
        resolve();
      });
    });
    req.on("timeout", () => { req.destroy(); warn("Ollama não respondeu em 2.5s"); resolve(); });
    req.on("error", () => { warn("Ollama offline ou não instalado"); resolve(); });
    req.end();
  });
}

async function main() {
  console.log("Noelle Mega Pack V14 - Diagnóstico\nRaiz: " + root);
  checkRequiredFiles();
  checkPackage();
  checkSyntax();
  checkArchitecture();
  checkExpressions();
  checkRequirements();
  checkBats();
  await checkOllama();
  console.log(`\nResultado: ${errors} erro(s), ${warnings} aviso(s).`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => { fail(err.stack || err.message || String(err)); process.exit(1); });
