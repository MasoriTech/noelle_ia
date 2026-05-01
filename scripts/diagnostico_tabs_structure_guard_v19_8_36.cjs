/* eslint-disable no-console */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const modulePath = path.join(ROOT, "src", "renderer", "modules", "noelle_tabs_structure_guard_v19_8_36.js");
let ok = true;
function check(cond, msg) { console.log((cond ? "[OK] " : "[ERRO] ") + msg); if (!cond) ok = false; }
check(fs.existsSync(modulePath), "guard v19.8.36 instalado em src/renderer/modules");
if (fs.existsSync(modulePath)) {
  try { require("child_process").execFileSync(process.execPath, ["--check", modulePath], { stdio: "pipe" }); check(true, "node --check do guard"); }
  catch { check(false, "node --check do guard"); }
}
const htmls = [];
function walk(dir) { if (!fs.existsSync(dir)) return; for (const n of fs.readdirSync(dir)) { const p = path.join(dir,n); const st=fs.statSync(p); if (st.isDirectory() && !["node_modules","release",".git","backups"].includes(n)) walk(p); else if (/\.html?$/i.test(n)) htmls.push(p); } }
walk(path.join(ROOT,"src"));
const injected = htmls.filter(f => fs.readFileSync(f,"utf8").includes("noelle_tabs_structure_guard_v19_8_36.js"));
check(injected.length > 0, "script do guard injetado em pelo menos um HTML");
injected.forEach(f => console.log("  -", path.relative(ROOT,f)));
console.log(ok ? "\nDIAGNOSTICO: OK" : "\nDIAGNOSTICO: FALHOU");
process.exit(ok ? 0 : 1);
