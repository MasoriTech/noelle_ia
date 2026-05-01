const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function read(file) {
  try { return fs.readFileSync(path.join(ROOT, file), "utf8"); }
  catch { return ""; }
}

console.log("Global Layout Revert V35.1 Diagnostics");
console.log("======================================");

for (const file of ["src/controls.html", "src/index.html"]) {
  const html = read(file);
  if (!html) {
    console.log("[MISSING] " + file);
    continue;
  }

  console.log("");
  console.log(file + ":");
  console.log(html.includes("global_layout_runtime_v35.js") && !html.includes("disabled global_layout_runtime_v35.js")
    ? "[WARN] runtime v35 ainda ativo"
    : "[OK] runtime v35 desativado");
  console.log(html.includes("global_layout_v35.css") && !html.includes("disabled global_layout_v35.css")
    ? "[WARN] css v35 ainda ativo"
    : "[OK] css v35 desativado");

  if (file === "src/controls.html") {
    console.log(html.includes("layout_revert_v35_1.js")
      ? "[OK] cleanup runtime presente"
      : "[WARN] cleanup runtime ausente");
  }
}

console.log("");
console.log("Próximo passo correto:");
console.log("1. Confirmar que abas voltaram.");
console.log("2. Não aplicar outro layout global agressivo.");
console.log("3. Ajustar página por página, começando pela aba Avatar funcional v19.8.3.");