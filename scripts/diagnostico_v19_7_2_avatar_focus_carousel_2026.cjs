"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const checks = [];
function ok(name, value, hint = "") { checks.push({ name, ok: !!value, hint }); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

ok("package.json", exists("package.json"));
ok("iniciar.bat atualizado", exists("iniciar.bat") && /V19.7.2|Avatar Preview V19.7.2|Avatar Foco/i.test(read("iniciar.bat")), "copie o iniciar.bat do pack para a raiz");
ok("src/avatar_lab_v19_6.html", exists("src/avatar_lab_v19_6.html"));
ok("avatar canvas grande", exists("src/avatar_lab_v19_6.html") && /carouselControls|Foco no personagem|btnPrev|btnNext/.test(read("src/avatar_lab_v19_6.html")), "HTML ainda parece antigo");
ok("src/renderer/avatar_lab_v19_6_app.js", exists("src/renderer/avatar_lab_v19_6_app.js"));
ok("sem top-level await", exists("src/renderer/avatar_lab_v19_6_app.js") && !/(^|
)s*awaits+load(MotionManifest|Avatar)s*(/.test(read("src/renderer/avatar_lab_v19_6_app.js")), "corrigir await solto");
ok("carrossel VRM", exists("src/renderer/avatar_lab_v19_6_app.js") && /btnPrev|btnNext|avatar_manifest|loadAvatarByIndex/.test(read("src/renderer/avatar_lab_v19_6_app.js")), "app ainda nao e carrossel");
ok("build script robusto", exists("scripts/build_avatar_lab_v19_6_2026.cjs") && /format:s*"iife"|format:s*'iife'/.test(read("scripts/build_avatar_lab_v19_6_2026.cjs")));
ok("manifest de avatares", exists("src/assets/avatar_manifest.json"), "rode o aplicador para gerar");
if (exists("src/assets/avatar_manifest.json")) {
  try {
    const data = JSON.parse(read("src/assets/avatar_manifest.json"));
    ok("manifest contem lista", Array.isArray(data.avatars) && data.avatars.length >= 1, "adicione .vrm em src/assets/avatars");
  } catch { ok("manifest JSON valido", false); }
}

let failed = 0;
console.log("===============================================================");
console.log(" Noelle/Yoru - Diagnostico Avatar Foco Carrossel V19.7.2");
console.log("===============================================================");
for (const c of checks) {
  if (c.ok) console.log("[OK] " + c.name);
  else { failed++; console.log("[ERRO] " + c.name + (c.hint ? " - " + c.hint : "")); }
}
if (failed) {
  console.log("===============================================================");
  console.log("[ERRO] Diagnostico falhou com " + failed + " problema(s).");
  process.exit(1);
}
console.log("===============================================================");
console.log("[OK] Avatar Preview maior e focado esta pronto.");
