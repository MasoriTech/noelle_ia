"use strict";

const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");
let ok = true;

function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function mark(label, passed, detail = "") {
  if (!passed) ok = false;
  console.log(`${passed ? "[OK]" : "[ERRO]"} ${label}${detail ? " - " + detail : ""}`);
}
function warn(label, detail = "") { console.log(`[AVISO] ${label}${detail ? " - " + detail : ""}`); }
function count(dir, exts) {
  if (!exists(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => exts.includes(path.extname(name).toLowerCase())).length;
}
function run(cmd, args) {
  try {
    const r = child_process.spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
    return { ok: r.status === 0, out: (r.stdout || r.stderr || "").trim() };
  } catch (err) { return { ok: false, out: err.message }; }
}
function nodeCheck(file) {
  const r = run(process.execPath, ["--check", file]);
  mark(`Sintaxe ${path.relative(ROOT, file)}`, r.ok, r.ok ? "" : r.out.slice(0, 300));
}

console.log("============================================================");
console.log(" Noelle V16 - diagnóstico de imports, assets, boot e TTS");
console.log("============================================================");

["package.json", "main.js", "preload.js", "src/controls.html", "src/avatar.html", "src/renderer/controls_window_app.js", "src/renderer/avatar_window_app.mjs", "src/styles/noelle.css", "src/styles/avatar.css", "INICIAR.bat"].forEach((rel) => mark(rel, exists(path.join(ROOT, rel))));

nodeCheck(path.join(ROOT, "main.js"));
nodeCheck(path.join(ROOT, "preload.js"));
nodeCheck(path.join(ROOT, "scripts", "rebuild_manifests_v16.cjs"));
nodeCheck(path.join(ROOT, "scripts", "bootstrap_v16.cjs"));

mark("src/assets/Noelle.vrm", exists(path.join(ASSETS, "Noelle.vrm")));
mark("src/assets/expressions", exists(path.join(ASSETS, "expressions")), `${count(path.join(ASSETS, "expressions"), [".png", ".webp", ".jpg", ".jpeg"])} imagens`);
mark("src/assets/motions", exists(path.join(ASSETS, "motions")), `${count(path.join(ASSETS, "motions"), [".vrma", ".vmd"])} motions`);
mark("src/assets/items", exists(path.join(ASSETS, "items")), `${count(path.join(ASSETS, "items"), [".glb", ".gltf"])} itens`);
mark("motion_manifest.json", exists(path.join(ASSETS, "motion_manifest.json")));
mark("item_manifest.json", exists(path.join(ASSETS, "item_manifest.json")));
mark("expressions/manifest.json", exists(path.join(ASSETS, "expressions", "manifest.json")));

const pkg = exists(path.join(ROOT, "package.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) : {};
mark("dependency electron", !!pkg.devDependencies?.electron, pkg.devDependencies?.electron || "");
mark("dependency three", !!pkg.dependencies?.three, pkg.dependencies?.three || "");
mark("dependency @pixiv/three-vrm", !!pkg.dependencies?.["@pixiv/three-vrm"], pkg.dependencies?.["@pixiv/three-vrm"] || "");
mark("requirements raiz", exists(path.join(ROOT, "requirements.txt")));
mark("requirements STT", exists(path.join(ROOT, "tools", "noelle_stt", "requirements.txt")));
mark("requirements TTS", exists(path.join(ROOT, "tools", "noelle_tts", "requirements.txt")));

const npm = run(process.platform === "win32" ? "npm.cmd" : "npm", ["-v"]);
mark("npm", npm.ok, npm.out.split(/\s+/)[0] || "");
const ollama = run("ollama", ["--version"]);
if (ollama.ok) mark("Ollama instalado", true, ollama.out.split("\n")[0]); else warn("Ollama não encontrado no PATH", "o chat precisa dele para responder");

console.log("============================================================");
console.log(ok ? "Diagnóstico final: OK estrutural." : "Diagnóstico final: há erros para corrigir antes do build.");
process.exit(ok ? 0 : 1);
