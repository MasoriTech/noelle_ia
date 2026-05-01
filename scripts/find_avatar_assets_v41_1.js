const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[asset-finder-v41.1] " + msg);
}

function ensureDir(rel) {
  fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
}

function walk(dir, maxDepth = 5, depth = 0, out = []) {
  if (depth > maxDepth || !fs.existsSync(dir)) return out;

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".git", "release", "dist", "out", "build"].includes(entry.name)) continue;
      walk(full, maxDepth, depth + 1, out);
    } else {
      out.push(full);
    }
  }

  return out;
}

function relFromRoot(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function copyIfBetter(src, destRel) {
  const dest = path.join(ROOT, destRel);
  ensureDir(path.dirname(destRel));

  if (!fs.existsSync(src)) return false;

  if (fs.existsSync(dest)) {
    log("já existe: " + destRel);
    return true;
  }

  fs.copyFileSync(src, dest);
  log("copiado: " + relFromRoot(src) + " -> " + destRel);
  return true;
}

ensureDir("src/assets/avatars");
ensureDir("src/assets/scenes");

const files = walk(ROOT, 5).filter((file) => /\.(vrm|glb|gltf)$/i.test(file));

let foundYoru = false;
let foundNezuko = false;
let foundNarutoScene = false;

for (const file of files) {
  const name = path.basename(file).toLowerCase();

  if (/yoru.*\.vrm$/i.test(name)) {
    if (copyIfBetter(file, "src/assets/avatars/Yoru.vrm")) foundYoru = true;
  }

  if (/nezuko.*\.(glb|gltf|vrm)$/i.test(name)) {
    const ext = path.extname(file).toLowerCase();
    if (copyIfBetter(file, "src/assets/avatars/nezuko_kamado" + ext)) foundNezuko = true;
  }

  if (/naruto.*(sala|examen|exame|chunnin|chunin).*\.(glb|gltf)$/i.test(name)) {
    const ext = path.extname(file).toLowerCase();
    if (copyIfBetter(file, "src/assets/scenes/naruto_sala_examen_chunnin" + ext)) foundNarutoScene = true;
  }
}

console.log(foundYoru ? "[OK] Yoru localizada/copiadada" : "[INFO] Yoru.vrm não encontrada automaticamente");
console.log(foundNezuko ? "[OK] Nezuko localizada/copiadada" : "[INFO] Nezuko não encontrada automaticamente");
console.log(foundNarutoScene ? "[OK] Arena Chunin localizada/copiadada" : "[INFO] Arena Chunin não encontrada automaticamente");