#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const ROOT = process.cwd();
const PATCH = "Noelle Chat IA - Correção de Janela V7";
const CONTROLS = "src/controls.html";
const APP_JS = "src/renderer/controls_window_app.js";
const MAIN_JS = "main.js";
const CSS = "src/styles/noelle_chat_force_fix_v7.css";
const JS = "src/renderer/noelle_chat_force_fix_v7.js";

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, text) { fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), text, "utf8"); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(ROOT, "backups", "chat_janela_v7_" + stamp(), rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(full(rel), dst);
}

function ensurePackFiles() {
  const missing = [CSS, JS].filter((rel) => !exists(rel));
  if (missing.length) {
    throw new Error("Arquivos do pack ausentes: " + missing.join(", ") + ". Extraia o ZIP inteiro dentro da raiz do noelle_ia.");
  }
}

function removeOldRefs(html) {
  return html
    .replace(/\s*<link[^>]+noelle_chat_[^>]*>\s*/gi, "\n")
    .replace(/\s*<script[^>]+noelle_chat_[^>]*><\/script>\s*/gi, "\n")
    .replace(/\s*<script[^>]+NOELLE_CHAT_FORCE_FIX_V7_INLINE[\s\S]*?<\/script>\s*/gi, "\n");
}

function injectHtml() {
  if (!exists(CONTROLS)) throw new Error("Nao encontrei " + CONTROLS + ". Rode o INICIAR.bat na raiz do noelle_ia.");
  backup(CONTROLS);
  let html = read(CONTROLS);
  html = removeOldRefs(html);

  const cssTag = '<link rel="stylesheet" href="./styles/noelle_chat_force_fix_v7.css?v=7">';
  const jsTag = '<script type="module" src="./renderer/noelle_chat_force_fix_v7.js?v=7"></script>';

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
  write(CONTROLS, html);
  console.log("OK: controls.html aponta para CSS/JS V7.");
}

function patchRendererApp() {
  if (!exists(APP_JS)) {
    console.warn("AVISO: " + APP_JS + " nao encontrado; usando somente injecao no HTML.");
    return;
  }
  backup(APP_JS);
  let text = read(APP_JS);

  // Remove importadores antigos deste pack, mas nao mexe no codigo principal.
  text = text.replace(/\n?;?\s*\(function\(\)\{\/\* NOELLE_CHAT_FORCE_FIX_V7_BOOT \*\/[\s\S]*?\/\* NOELLE_CHAT_FORCE_FIX_V7_BOOT_END \*\/\}\)\(\);?/g, "");

  const boot = `
;(function(){/* NOELLE_CHAT_FORCE_FIX_V7_BOOT */
  try {
    if (!window.__NOELLE_CHAT_FORCE_FIX_V7_SCRIPT_TAG__) {
      window.__NOELLE_CHAT_FORCE_FIX_V7_SCRIPT_TAG__ = true;
      setTimeout(function(){
        if (document.querySelector('script[data-noelle-chat-force-fix-v7]')) return;
        var s = document.createElement('script');
        s.type = 'module';
        s.dataset.noelleChatForceFixV7 = '1';
        s.src = './renderer/noelle_chat_force_fix_v7.js?v=7';
        (document.head || document.documentElement).appendChild(s);
      }, 350);
    }
  } catch (_) {}
/* NOELLE_CHAT_FORCE_FIX_V7_BOOT_END */})();
`;
  text += boot;
  write(APP_JS, text);
  console.log("OK: controls_window_app.js recebeu boot de segurança do V7.");
}

function patchRendererDistFallbacks() {
  const dist = full("src/renderer_dist");
  if (!fs.existsSync(dist)) return;
  const targets = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.toLowerCase().endsWith(".js")) {
        const text = fs.readFileSync(p, "utf8");
        if (text.includes("coreChatLog") || text.includes("coreSendBtn") || text.includes("coreChatInput")) targets.push(p);
      }
    }
  }
  walk(dist);
  for (const file of targets) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    backup(rel);
    let text = fs.readFileSync(file, "utf8");
    text = text.replace(/\n?;?\s*\(function\(\)\{\/\* NOELLE_CHAT_FORCE_FIX_V7_BOOT \*\/[\s\S]*?\/\* NOELLE_CHAT_FORCE_FIX_V7_BOOT_END \*\/\}\)\(\);?/g, "");
    text += `
;(function(){/* NOELLE_CHAT_FORCE_FIX_V7_BOOT */try{setTimeout(function(){if(document.querySelector('script[data-noelle-chat-force-fix-v7]'))return;var s=document.createElement('script');s.type='module';s.dataset.noelleChatForceFixV7='1';s.src='./renderer/noelle_chat_force_fix_v7.js?v=7';(document.head||document.documentElement).appendChild(s);},350)}catch(_){ }/* NOELLE_CHAT_FORCE_FIX_V7_BOOT_END */})();
`;
    fs.writeFileSync(file, text, "utf8");
    console.log("OK: fallback V7 aplicado em " + rel);
  }
}

function patchMainJs() {
  if (!exists(MAIN_JS)) return;
  backup(MAIN_JS);
  let text = read(MAIN_JS);
  let changed = false;
  if (!/function\s+ensureDir\s*\(/.test(text) && !/const\s+ensureDir\s*=/.test(text)) {
    const helper = `\nfunction ensureDir(dirPath) {\n  if (!dirPath) return;\n  fs.mkdirSync(dirPath, { recursive: true });\n}\n`;
    if (/const\s+fs\s*=\s*require\(["']fs["']\);/.test(text)) {
      text = text.replace(/const\s+fs\s*=\s*require\(["']fs["']\);/, (m) => m + helper);
    } else {
      text = `const fs = require("fs");\n${helper}\n` + text;
    }
    changed = true;
    console.log("OK: ensureDir() garantido no main.js.");
  }
  if (changed) write(MAIN_JS, text);
}

function apply() {
  console.log("Aplicando " + PATCH + "...\n");
  ensurePackFiles();
  injectHtml();
  patchRendererApp();
  patchRendererDistFallbacks();
  patchMainJs();
  console.log("\nConcluido. Feche a janela da Noelle e abra de novo.");
  console.log("Se voce estiver rodando uma versao portable ja empacotada, rode pelo codigo fonte ou recompile depois do patch.");
}

function cleanBats() {
  const keep = new Set(["iniciar.bat"]);
  const files = fs.readdirSync(ROOT).filter((name) => name.toLowerCase().endsWith(".bat") && !keep.has(name.toLowerCase()));
  if (!files.length) {
    console.log("Nenhum .bat extra encontrado na raiz.");
    return;
  }
  const dst = path.join(ROOT, "backups", "bats_limpos_" + stamp());
  fs.mkdirSync(dst, { recursive: true });
  for (const f of files) {
    fs.renameSync(path.join(ROOT, f), path.join(dst, f));
    console.log("Movido:", f);
  }
  console.log("\nBATs extras movidos para: " + dst);
}

function requestJson(url, timeoutMs = 2400) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: data ? JSON.parse(data) : null, statusCode: res.statusCode }); }
        catch (err) { resolve({ ok: false, error: "JSON invalido: " + err.message, statusCode: res.statusCode }); }
      });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
  });
}

async function diagnose() {
  console.log("Diagnostico - Janela Chat IA V7\n");
  for (const rel of [CONTROLS, APP_JS, CSS, JS, MAIN_JS, "package.json"]) {
    console.log((exists(rel) ? "OK   " : "FALHA") + " - " + rel);
  }
  if (exists(CONTROLS)) {
    const html = read(CONTROLS);
    console.log((html.includes("noelle_chat_force_fix_v7.css") ? "OK   " : "FALHA") + " - CSS V7 no controls.html");
    console.log((html.includes("noelle_chat_force_fix_v7.js") ? "OK   " : "FALHA") + " - JS V7 no controls.html");
  }
  if (exists(APP_JS)) {
    const js = read(APP_JS);
    console.log((js.includes("NOELLE_CHAT_FORCE_FIX_V7_BOOT") ? "OK   " : "AVISO") + " - boot V7 no renderer principal");
  }
  const ollama = await requestJson("http://127.0.0.1:11434/api/tags");
  if (ollama.ok) {
    const models = Array.isArray(ollama.data?.models) ? ollama.data.models.map((m) => m.name).join(", ") : "sem lista";
    console.log("OK   - Ollama online");
    console.log("Modelos: " + (models || "nenhum"));
  } else {
    console.log("AVISO - Ollama offline/fechado: " + (ollama.error || ollama.statusCode || "sem resposta"));
  }
}

function startMain() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["start"], { cwd: ROOT, stdio: "inherit", shell: false });
  child.on("exit", (code) => process.exitCode = code || 0);
}

const cmd = process.argv[2] || "apply";
Promise.resolve().then(async () => {
  if (cmd === "apply") apply();
  else if (cmd === "diagnose") await diagnose();
  else if (cmd === "clean-bats") cleanBats();
  else if (cmd === "start") startMain();
  else throw new Error("Comando desconhecido: " + cmd);
}).catch((err) => {
  console.error("\nERRO:", err.message || err);
  process.exitCode = 1;
});
