"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const repoRoot = process.cwd();
const yoruRoot = path.resolve(__dirname, "..");
function ok(msg) { console.log("[OK]", msg); }
function warn(msg) { console.log("[AVISO]", msg); }
function err(msg) { console.log("[ERRO]", msg); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
async function testYoru() {
  return new Promise(resolve => {
    const py = process.env.YORU_PYTHON || "python";
    const p = spawn(py, ["-m", "yoru_bridge", "embedded"], {
      cwd: yoruRoot,
      env: { ...process.env, PYTHONPATH: path.join(yoruRoot, "src"), PYGAME_HIDE_SUPPORT_PROMPT: "1", PYTHONIOENCODING: "utf-8" },
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true
    });
    let out = "", er = "";
    const timer = setTimeout(() => { try { p.kill(); } catch (_) {} resolve({ ok: false, error: "timeout", out, er }); }, 20000);
    p.stdout.on("data", d => { out += d.toString("utf8"); if (out.includes('"type":"ready"') || out.includes('"type": "ready"')) { p.stdin.write(JSON.stringify({type:"status",id:"diag"})+"\n"); } if (out.includes('"id":"diag"') || out.includes('"id": "diag"')) { clearTimeout(timer); try { p.kill(); } catch (_) {} resolve({ ok: true, out, er }); }});
    p.stderr.on("data", d => { er += d.toString("utf8"); });
    p.on("error", e => { clearTimeout(timer); resolve({ ok:false, error:String(e.message||e), out, er }); });
  });
}
(async () => {
  console.log("=== Diagnóstico NoelleKoboldReplace 2026 ===");
  exists("main.js") ? ok("main.js encontrado") : err("main.js não encontrado; rode na raiz do Noelle Companion");
  exists("package.json") ? ok("package.json encontrado") : warn("package.json não encontrado");
  fs.existsSync(path.join(yoruRoot,"src","yoru_bridge")) ? ok("yoru_chat/src/yoru_bridge encontrado") : err("yoru_chat inválido");
  exists("src/main/yoru_kobold_embedded_client.cjs") ? ok("cliente JS instalado em src/main") : warn("cliente JS ainda não instalado; rode apply_noelle_kobold_replace_2026.cjs");
  if (exists("main.js")) {
    const main = fs.readFileSync(path.join(repoRoot,"main.js"),"utf8");
    main.includes("YORU_KOBOLD_REPLACE_2026_BEGIN") ? ok("patch no main.js encontrado") : warn("patch no main.js não encontrado");
    main.includes("OLLAMA_PORT") ? warn("código Ollama antigo ainda existe como legado, mas o patch substitui noelle:chat") : ok("sem marca OLLAMA_PORT no main.js");
  }
  if (exists("package.json")) {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot,"package.json"),"utf8"));
    const files = pkg.build && Array.isArray(pkg.build.files) ? pkg.build.files : [];
    files.includes("yoru_chat/**/*") ? ok("build.files inclui yoru_chat/**/*") : warn("build.files não inclui yoru_chat/**/*");
  }
  const y = await testYoru();
  y.ok ? ok("python -m yoru_bridge embedded respondeu") : err("Yoru embedded falhou: " + (y.error || y.er || y.out));
  console.log("=== Fim ===");
})();
