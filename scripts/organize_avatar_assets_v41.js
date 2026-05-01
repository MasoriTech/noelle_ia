const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[assets-v41] " + msg);
}

function ensureDir(dir) {
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
}

ensureDir("src/assets/avatars");
ensureDir("src/assets/scenes");

const narutoNames = [
  "naruto_sala_examen_chunnin.glb",
  "naruto_sala_examen_chunin.glb",
  "naruto_sala_exame_chunnin.glb",
  "naruto_sala_examen_chunnin.gltf"
];

for (const name of narutoNames) {
  const from = path.join(ROOT, "src", "assets", "avatars", name);
  const to = path.join(ROOT, "src", "assets", "scenes", name);

  if (fs.existsSync(from) && !fs.existsSync(to)) {
    fs.renameSync(from, to);
    log("Naruto movido para scenes: " + name);
  }
}