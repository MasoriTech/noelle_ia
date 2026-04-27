#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = process.cwd();
const PATCH = "Noelle Chat IA V8 - layout + spawn EINVAL";
const CONTROLS = "src/controls.html";
const APP_JS = "src/renderer/controls_window_app.js";
const MAIN_JS = "main.js";
const CSS = "src/styles/noelle_chat_v8_modern.css";
const JS = "src/renderer/noelle_chat_v8_modern.js";

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, text) { fs.mkdirSync(path.dirname(full(rel)), { recursive: true }); fs.writeFileSync(full(rel), text, "utf8"); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(ROOT, "backups", "chat_v8_" + stamp(), rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(full(rel), dst);
}

function ensurePackFiles() {
  const missing = [CSS, JS].filter((rel) => !exists(rel));
  if (missing.length) throw new Error("Arquivos do pack ausentes: " + missing.join(", ") + ". Extraia o ZIP inteiro dentro da raiz do noelle_ia.");
}

function removeOldChatPatchRefs(html) {
  return html
    .replace(/\s*<link[^>]+noelle_chat_[^>]*>\s*/gi, "\n")
    .replace(/\s*<script[^>]+noelle_chat_[^>]*><\/script>\s*/gi, "\n");
}

function injectHtml() {
  if (!exists(CONTROLS)) throw new Error("Nao encontrei " + CONTROLS + ". Rode o INICIAR.bat na raiz do noelle_ia.");
  backup(CONTROLS);
  let html = read(CONTROLS);
  html = removeOldChatPatchRefs(html);
  const cssTag = '<link rel="stylesheet" href="./styles/noelle_chat_v8_modern.css?v=8">';
  const jsTag = '<script src="./renderer/noelle_chat_v8_modern.js?v=8"></script>';
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `  ${cssTag}\n</head>`) : `${cssTag}\n${html}`;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `  ${jsTag}\n</body>`) : `${html}\n${jsTag}\n`;
  write(CONTROLS, html);
  console.log("OK: controls.html recebeu CSS/JS V8.");
}

function patchRendererAppBoot() {
  if (!exists(APP_JS)) {
    console.warn("AVISO: " + APP_JS + " nao encontrado; usando somente injecao no HTML.");
    return;
  }
  backup(APP_JS);
  let text = read(APP_JS);
  text = text.replace(/\n?;?\s*\(function\(\)\{\/\* NOELLE_CHAT_V\d+_BOOT \*\/[\s\S]*?\/\* NOELLE_CHAT_V\d+_BOOT_END \*\/\}\)\(\);?/g, "");
  text = text.replace(/noelle_chat_(force_fix_v7|v8_modern)\.js\?v=\d+/g, "noelle_chat_v8_modern.js?v=8");
  const boot = `
;(function(){/* NOELLE_CHAT_V8_BOOT */
  try {
    setTimeout(function(){
      if (document.querySelector('script[data-noelle-chat-v8-modern]')) return;
      var s = document.createElement('script');
      s.dataset.noelleChatV8Modern = '1';
      s.src = './renderer/noelle_chat_v8_modern.js?v=8';
      (document.head || document.documentElement).appendChild(s);
    }, 250);
  } catch (_) {}
/* NOELLE_CHAT_V8_BOOT_END */})();
`;
  text += boot;
  write(APP_JS, text);
  console.log("OK: renderer principal recebeu boot de seguranca V8.");
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
    text = text.replace(/\n?;?\s*\(function\(\)\{\/\* NOELLE_CHAT_V\d+_BOOT \*\/[\s\S]*?\/\* NOELLE_CHAT_V\d+_BOOT_END \*\/\}\)\(\);?/g, "");
    text += `
;(function(){/* NOELLE_CHAT_V8_BOOT */try{setTimeout(function(){if(document.querySelector('script[data-noelle-chat-v8-modern]'))return;var s=document.createElement('script');s.dataset.noelleChatV8Modern='1';s.src='./renderer/noelle_chat_v8_modern.js?v=8';(document.head||document.documentElement).appendChild(s);},250)}catch(_){ }/* NOELLE_CHAT_V8_BOOT_END */})();
`;
    fs.writeFileSync(file, text, "utf8");
    console.log("OK: fallback V8 aplicado em " + rel);
  }
}

function patchMainEnsureDirAndSpawn() {
  if (!exists(MAIN_JS)) return;
  backup(MAIN_JS);
  let text = read(MAIN_JS);
  let changed = false;

  if (!/function\s+ensureDir\s*\(/.test(text) && !/const\s+ensureDir\s*=/.test(text)) {
    const helper = `
function ensureDir(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}
`;
    if (/const\s+fs\s*=\s*require\(["']fs["']\);/.test(text)) {
      text = text.replace(/const\s+fs\s*=\s*require\(["']fs["']\);/, (m) => m + helper);
    } else {
      text = `const fs = require("fs");\n${helper}\n` + text;
    }
    changed = true;
    console.log("OK: ensureDir() garantido no main.js.");
  }

  if (!text.includes("NOELLE_SAFE_SPAWN_V8")) {
    const helper = `
/* NOELLE_SAFE_SPAWN_V8 */
const NOELLE_ORIGINAL_SPAWN_V8 = spawn;
function noelleFakeSpawnErrorV8(err) {
  const { EventEmitter } = require("events");
  const cp = new EventEmitter();
  cp.stdout = new EventEmitter();
  cp.stderr = new EventEmitter();
  cp.kill = function(){};
  process.nextTick(() => cp.emit("error", err));
  return cp;
}
function noelleSafeSpawnV8(command, args = [], options = {}) {
  try {
    let cmd = String(command || "").trim().replace(/\u0000/g, "");
    if (!cmd) return noelleFakeSpawnErrorV8(new Error("spawn EINVAL: comando vazio"));
    const cleanArgs = Array.isArray(args) ? args.map((item) => String(item ?? "").replace(/\u0000/g, "")) : [];
    const opts = { ...(options || {}) };
    if (opts.cwd && !fs.existsSync(opts.cwd)) opts.cwd = __dirname;
    if (process.platform === "win32") {
      const lower = cmd.toLowerCase();
      if (lower === "powershell") cmd = "powershell.exe";
      if (lower === "python") cmd = "python.exe";
      if (lower === "py") cmd = "py.exe";
      if (lower.endsWith(".cmd") || lower.endsWith(".bat")) opts.shell = true;
      opts.windowsHide = true;
    }
    return NOELLE_ORIGINAL_SPAWN_V8(cmd, cleanArgs, opts);
  } catch (err) {
    return noelleFakeSpawnErrorV8(err);
  }
}
/* NOELLE_SAFE_SPAWN_V8_END */
`;
    if (/const\s*\{\s*spawn\s*\}\s*=\s*require\(["']child_process["']\);/.test(text)) {
      text = text.replace(/const\s*\{\s*spawn\s*\}\s*=\s*require\(["']child_process["']\);/, (m) => m + helper);
      text = text.replace(/\bspawn\(/g, "noelleSafeSpawnV8(");
      text = text.replace(/function\s+noelleSafeSpawnV8\(/g, "function noelleSafeSpawnV8(");
      text = text.replace(/const NOELLE_ORIGINAL_SPAWN_V8 = noelleSafeSpawnV8;/g, "const NOELLE_ORIGINAL_SPAWN_V8 = spawn;");
      changed = true;
      console.log("OK: spawn() protegido contra EINVAL no main.js.");
    } else {
      console.warn("AVISO: nao encontrei import de spawn para aplicar wrapper V8.");
    }
  }

  // Evita duplicar wrappers se um patch antigo inseriu chamadas diretas no renderer dist.
  if (changed) write(MAIN_JS, text);
}

function apply() {
  console.log("Aplicando " + PATCH + "...\n");
  ensurePackFiles();
  injectHtml();
  patchRendererAppBoot();
  patchRendererDistFallbacks();
  patchMainEnsureDirAndSpawn();
  console.log("\nConcluido.");
  console.log("Agora feche a Noelle inteira e abra de novo pelo INICIAR.bat.");
  console.log("Se estiver usando portable/instalador antigo, recompile ou rode pelo codigo fonte.");
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
  console.log("Diagnostico - Chat IA V8\n");
  for (const rel of [CONTROLS, APP_JS, CSS, JS, MAIN_JS, "package.json"]) {
    console.log((exists(rel) ? "OK   " : "FALHA") + " - " + rel);
  }
  if (exists(CONTROLS)) {
    const html = read(CONTROLS);
    console.log((html.includes("noelle_chat_v8_modern.css") ? "OK   " : "FALHA") + " - CSS V8 no controls.html");
    console.log((html.includes("noelle_chat_v8_modern.js") ? "OK   " : "FALHA") + " - JS V8 no controls.html");
  }
  if (exists(MAIN_JS)) {
    const main = read(MAIN_JS);
    console.log((main.includes("NOELLE_SAFE_SPAWN_V8") ? "OK   " : "AVISO") + " - safe spawn V8 no main.js");
    console.log((/function\s+ensureDir\s*\(/.test(main) || /const\s+ensureDir\s*=/.test(main) ? "OK   " : "AVISO") + " - ensureDir no main.js");
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

const cmd = process.argv[2] || "apply";
Promise.resolve().then(async () => {
  if (cmd === "apply") apply();
  else if (cmd === "diagnose") await diagnose();
  else if (cmd === "clean-bats") cleanBats();
  else throw new Error("Comando desconhecido: " + cmd);
}).catch((err) => {
  console.error("\nERRO:", err.message || err);
  process.exitCode = 1;
});
