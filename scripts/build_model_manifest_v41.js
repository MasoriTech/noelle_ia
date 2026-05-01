const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "src", "assets", "model_manifest_v41.json");

function existsSrc(rel) {
  return fs.existsSync(path.join(ROOT, "src", rel));
}

function inferType(file) {
  const ext = path.extname(file).toLowerCase().replace(".", "");
  if (ext === "vrm") return "vrm";
  if (ext === "glb" || ext === "gltf") return "glb";
  return ext || "auto";
}

function titleFromFile(file) {
  return path.basename(file, path.extname(file))
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function scan(dir, kind) {
  const abs = path.join(ROOT, "src", dir);
  if (!fs.existsSync(abs)) return [];

  return fs.readdirSync(abs)
    .filter((file) => /\.(vrm|glb|gltf)$/i.test(file))
    .map((file) => ({
      name: titleFromFile(file),
      path: dir.replace(/^src\//, "") + "/" + file,
      type: inferType(file),
      kind,
      exists: true
    }));
}

const avatars = [
  {
    name: "Noelle",
    path: "assets/Noelle.vrm",
    type: "vrm",
    kind: "avatar",
    default: true,
    mode: "fast",
    exists: existsSrc("assets/Noelle.vrm")
  }
];

const yoruPath = "assets/avatars/Yoru.vrm";
if (!avatars.some((item) => item.path === yoruPath)) {
  avatars.push({
    name: "Yoru",
    path: yoruPath,
    type: "vrm",
    kind: "avatar",
    exists: existsSrc(yoruPath)
  });
}

for (const item of scan("assets/avatars", "avatar")) {
  if (!avatars.some((avatar) => avatar.path === item.path)) {
    avatars.push(item);
  }
}

const scenes = scan("assets/scenes", "scene").map((scene) => {
  if (/naruto.*(sala|examen|exame|chunnin|chunin)/i.test(scene.path)) {
    return {
      ...scene,
      name: "Arena Chunin",
      label: "Naruto Sala Examen Chunnin"
    };
  }
  return scene;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  version: "v41",
  generatedAt: new Date().toISOString(),
  rule: "Noelle usa Loadfile rápido. Outros modelos usam viewers separados.",
  avatars,
  scenes
}, null, 2), "utf8");

console.log("[manifest-v41] avatars: " + avatars.length);
console.log("[manifest-v41] scenes: " + scenes.length);
for (const avatar of avatars) {
  console.log((avatar.exists ? "[OK] " : "[MISSING] ") + avatar.kind + " " + avatar.path);
}
for (const scene of scenes) {
  console.log((scene.exists ? "[OK] " : "[MISSING] ") + scene.kind + " " + scene.path);
}