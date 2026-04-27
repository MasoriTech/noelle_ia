#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const root = process.cwd();

const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => exists(p) ? fs.readFileSync(path.join(root, p), "utf8") : "";
const list = (p, rx) => exists(p) ? fs.readdirSync(path.join(root, p)).filter(f => rx.test(f)).sort() : [];
const ok = (label, yes, extra = "") => console.log(`${yes ? "OK " : "ERRO"} | ${label}${extra ? " | " + extra : ""}`);
const warn = (label, yes, extra = "") => console.log(`${yes ? "OK " : "AVISO"} | ${label}${extra ? " | " + extra : ""}`);

function jsonCount(p) {
  try {
    const text = read(p).trim();
    if (!text) return 0;
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.length : -1;
  } catch { return -1; }
}
function command(cmd, args) {
  try {
    const res = cp.spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
    if (res.error || res.status !== 0) return "nao encontrado";
    return (res.stdout || res.stderr || "ok").trim().split(/\r?\n/)[0];
  } catch { return "nao encontrado"; }
}

console.log("============================================================");
console.log(" Noelle V15 - Diagnostico de imports/assets/TTS");
console.log("============================================================");

ok("package.json", exists("package.json"));
ok("main.js", exists("main.js"));
ok("preload.js", exists("preload.js"));
ok("src/controls.html", exists("src/controls.html"));
ok("src/renderer/controls_window_app.js", exists("src/renderer/controls_window_app.js"));

const pkg = read("package.json");
warn("Electron declarado", /"electron"\s*:/.test(pkg), /"electron"\s*:\s*"([^"]+)"/.exec(pkg)?.[1] || "sem versao");
warn("Script diagnostico:v15", pkg.includes("diagnostico:v15"));

const main = read("main.js");
const preload = read("preload.js");
const renderer = read("src/renderer/controls_window_app.js") + "\n" + read("src/renderer/noelle_assets_bridge_v15.js");
const html = read("src/controls.html");

warn("main.js tem ponte TTS V15", main.includes("NOELLE_V15_TTS_MAIN_START"));
warn("preload expõe noelleTTS", preload.includes("noelleTTS"));
warn("preload expõe noelleAPI", preload.includes("noelleAPI"));
warn("preload expõe desktopWidget", preload.includes("desktopWidget"));
warn("HTML importa ponte de assets", html.includes("noelle_assets_bridge_v15.js"));

const expr = list("src/assets/expressions", /\.(png|jpg|jpeg|webp)$/i);
const motions = list("src/assets/motions", /\.vrma$/i);
const items = list("src/assets/items", /\.(glb|gltf)$/i);
ok("src/assets/Noelle.vrm", exists("src/assets/Noelle.vrm"));
ok("expressions/*.png", expr.length > 0, `${expr.length} arquivo(s)`);
ok("motions/*.vrma", motions.length > 0, `${motions.length} arquivo(s)`);
warn("items/*.glb", items.length > 0, `${items.length} arquivo(s)`);

const exprCount = jsonCount("src/assets/expressions/manifest.json");
const motionCount = jsonCount("src/assets/motion_manifest.json");
const itemCount = jsonCount("src/assets/item_manifest.json");
ok("expressions/manifest.json válido", exprCount >= 0, `${exprCount} item(ns)`);
ok("motion_manifest.json válido", motionCount >= 0, `${motionCount} item(ns)`);
warn("item_manifest.json válido", itemCount >= 0, `${itemCount} item(ns)`);

warn("Renderer/bridge menciona expressions", /expressions/.test(renderer));
warn("Renderer/bridge menciona motion_manifest", /motion_manifest/.test(renderer));
warn("Renderer/bridge menciona item_manifest", /item_manifest/.test(renderer));
warn("Renderer/bridge menciona Noelle.vrm/avatar", /Noelle\.vrm|avatar/i.test(renderer));

ok("requirements.txt raiz", exists("requirements.txt"));
ok("tools/noelle_stt/requirements.txt", exists("tools/noelle_stt/requirements.txt"));
ok("tools/noelle_tts/requirements.txt", exists("tools/noelle_tts/requirements.txt"));
warn("requirements inclui piper-tts", read("tools/noelle_tts/requirements.txt").includes("piper-tts"));
warn("requirements inclui faster-whisper", read("tools/noelle_stt/requirements.txt").includes("faster-whisper"));
ok("tools/noelle_tts/speak_piper.py", exists("tools/noelle_tts/speak_piper.py"));

console.log("\nDependencias detectadas:");
console.log(`node: ${command("node", ["--version"])}`);
console.log(`npm: ${command("npm", ["--version"])}`);
console.log(`python/py: ${command("py", ["-3", "--version"])}`);

const venvPy = path.join(root, ".venv", "Scripts", "python.exe");
if (fs.existsSync(venvPy)) {
  console.log(`venv python: ${command(venvPy, ["--version"])}`);
  console.log(`piper-tts: ${command(venvPy, ["-m", "pip", "show", "piper-tts"])}`);
  try { cp.spawnSync(venvPy, ["tools/noelle_tts/speak_piper.py", "--status"], { cwd: root, stdio: "inherit", shell: false }); } catch {}
} else {
  console.log("venv python: nao encontrado");
}

console.log("\nSe expressions/motions existem mas aparecem 0 no manifest, rode: INICIAR.bat > opcao 4.");
