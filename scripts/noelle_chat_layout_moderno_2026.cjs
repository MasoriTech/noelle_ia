#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const ROOT = process.cwd();
const PATCH = "Noelle Chat IA Moderno 2026 V6";
const CSS_REL = "src/styles/noelle_chat_moderno_2026.css";
const JS_REL = "src/renderer/noelle_chat_moderno_2026.js";
const CONTROLS_REL = "src/controls.html";
const MAIN_REL = "main.js";

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, text) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), text, "utf8");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return null;
  const dst = path.join(ROOT, "backups", "chat_moderno_2026", stamp(), rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return dst;
}

function ensureExtractedFiles() {
  const required = [CSS_REL, JS_REL];
  const missing = required.filter((rel) => !exists(rel));
  if (missing.length) {
    throw new Error("Arquivos do patch ausentes: " + missing.join(", ") + ". Extraia o ZIP inteiro na raiz do projeto.");
  }
}

function removeOldPatchRefs(html) {
  return html
    .replace(/\s*<link[^>]+noelle_chat_focus_patch[^>]*>\s*/gi, "\n")
    .replace(/\s*<link[^>]+noelle_chat_safe_repair[^>]*>\s*/gi, "\n")
    .replace(/\s*<link[^>]+noelle_chat_moderno_2026[^>]*>\s*/gi, "\n")
    .replace(/\s*<script[^>]+noelle_chat_focus_patch[^>]*><\/script>\s*/gi, "\n")
    .replace(/\s*<script[^>]+noelle_chat_safe_repair[^>]*><\/script>\s*/gi, "\n")
    .replace(/\s*<script[^>]+noelle_chat_moderno_2026[^>]*><\/script>\s*/gi, "\n");
}

function injectControlsHtml() {
  if (!exists(CONTROLS_REL)) {
    throw new Error("Nao encontrei " + CONTROLS_REL + ". Rode este BAT na raiz do noelle_ia.");
  }
  backup(CONTROLS_REL);
  let html = read(CONTROLS_REL);
  html = removeOldPatchRefs(html);

  const cssTag = '<link rel="stylesheet" href="./styles/noelle_chat_moderno_2026.css">';
  const jsTag = '<script src="./renderer/noelle_chat_moderno_2026.js"></script>';

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `  ${cssTag}\n</head>`);
  } else {
    html = `${cssTag}\n${html}`;
  }

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `  ${jsTag}\n</body>`);
  } else {
    html = `${html}\n${jsTag}\n`;
  }

  write(CONTROLS_REL, html);
  console.log("OK: controls.html recebeu CSS/JS do chat moderno.");
}

function ensureMainJsHelpers() {
  if (!exists(MAIN_REL)) {
    console.warn("AVISO: main.js nao encontrado; pulei ensureDir.");
    return;
  }
  let text = read(MAIN_REL);
  let changed = false;
  backup(MAIN_REL);

  if (!/function\s+ensureDir\s*\(/.test(text) && !/const\s+ensureDir\s*=/.test(text)) {
    const helper = `\nfunction ensureDir(dirPath) {\n  if (!dirPath) return;\n  fs.mkdirSync(dirPath, { recursive: true });\n}\n`;
    if (/const\s+fs\s*=\s*require\(["']fs["']\);/.test(text)) {
      text = text.replace(/const\s+fs\s*=\s*require\(["']fs["']\);/, (m) => m + helper);
    } else {
      text = helper + text;
    }
    changed = true;
    console.log("OK: ensureDir() adicionado ao main.js.");
  } else {
    console.log("OK: ensureDir() ja existe no main.js.");
  }

  // Evita sobreposição de titlebar customizada com barra nativa no Windows.
  if (/titleBarOverlay\s*:/.test(text)) {
    text = text.replace(/,?\s*titleBarOverlay\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");
    changed = true;
    console.log("OK: titleBarOverlay removido para evitar barra superior sobreposta.");
  }

  if (changed) write(MAIN_REL, text);
}

function apply() {
  console.log("Aplicando " + PATCH + "...");
  ensureExtractedFiles();
  injectControlsHtml();
  ensureMainJsHelpers();
  console.log("\nConcluido. Teste a aba Chat IA. Se a janela estiver aberta, feche e abra de novo.");
}

function cleanBats() {
  const keep = new Set(["INICIAR.bat", "iniciar.bat"]);
  const files = fs.readdirSync(ROOT).filter((name) => name.toLowerCase().endsWith(".bat") && !keep.has(name));
  if (!files.length) {
    console.log("Nenhum .bat extra encontrado na raiz.");
    return;
  }
  const dstDir = path.join(ROOT, "backups", "bats_limpos_" + stamp());
  fs.mkdirSync(dstDir, { recursive: true });
  for (const file of files) {
    fs.renameSync(path.join(ROOT, file), path.join(dstDir, file));
    console.log("Movido:", file);
  }
  console.log("\nPronto. Os .bat extras foram movidos para:");
  console.log(dstDir);
}

function requestJson(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (err) {
          resolve({ ok: false, statusCode: res.statusCode, error: "JSON invalido: " + err.message });
        }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

async function diagnose() {
  console.log("Diagnostico rapido - Chat IA / Ollama\n");
  const checks = [
    ["controls.html", exists(CONTROLS_REL)],
    ["CSS moderno", exists(CSS_REL)],
    ["JS moderno", exists(JS_REL)],
    ["package.json", exists("package.json")],
    ["main.js", exists(MAIN_REL)],
  ];
  for (const [name, ok] of checks) console.log((ok ? "OK   " : "FALHA") + " - " + name);

  if (exists(CONTROLS_REL)) {
    const html = read(CONTROLS_REL);
    console.log((html.includes("noelle_chat_moderno_2026.css") ? "OK   " : "FALHA") + " - CSS injetado em controls.html");
    console.log((html.includes("noelle_chat_moderno_2026.js") ? "OK   " : "FALHA") + " - JS injetado em controls.html");
  }

  const ollama = await requestJson("http://127.0.0.1:11434/api/tags");
  if (ollama.ok) {
    const models = Array.isArray(ollama.data?.models) ? ollama.data.models.map((m) => m.name).join(", ") : "sem lista";
    console.log("OK   - Ollama online em 127.0.0.1:11434");
    console.log("Modelos:", models || "nenhum modelo encontrado");
  } else {
    console.log("AVISO - Ollama offline/fechado em 127.0.0.1:11434 (" + (ollama.error || ollama.statusCode || "sem resposta") + ")");
    console.log("Dica: abra o Ollama antes de testar a IA.");
  }
}

const cmd = process.argv[2] || "apply";
Promise.resolve()
  .then(async () => {
    if (cmd === "apply") apply();
    else if (cmd === "diagnose") await diagnose();
    else if (cmd === "clean-bats") cleanBats();
    else throw new Error("Comando desconhecido: " + cmd);
  })
  .catch((err) => {
    console.error("\nERRO:", err.message || err);
    process.exitCode = 1;
  });
