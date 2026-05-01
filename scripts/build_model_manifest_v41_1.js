const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, "src", "assets", "model_manifest_v41_1.json");
const OUT_JS = path.join(ROOT, "src", "renderer", "pages", "avatar", "model_manifest_v41_1.js");

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
      path: dir + "/" + file,
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
  },
  {
    name: "Yoru",
    path: "assets/avatars/Yoru.vrm",
    type: "vrm",
    kind: "avatar",
    exists: existsSrc("assets/avatars/Yoru.vrm"),
    expected: true
  },
  {
    name: "Nezuko Kamado",
    path: "assets/avatars/nezuko_kamado.glb",
    type: "glb",
    kind: "avatar",
    exists: existsSrc("assets/avatars/nezuko_kamado.glb"),
    expected: true
  }
];

for (const item of scan("assets/avatars", "avatar")) {
  if (!avatars.some((avatar) => avatar.path.toLowerCase() === item.path.toLowerCase())) {
    avatars.push(item);
  }
}

const scenes = [
  {
    name: "Arena Chunin",
    path: "assets/scenes/naruto_sala_examen_chunnin.glb",
    type: "glb",
    kind: "scene",
    exists: existsSrc("assets/scenes/naruto_sala_examen_chunnin.glb"),
    expected: true,
    label: "Naruto Sala Examen Chunnin"
  }
];

for (const scene of scan("assets/scenes", "scene")) {
  if (!scenes.some((item) => item.path.toLowerCase() === scene.path.toLowerCase())) {
    scenes.push(scene);
  }
}

const manifest = {
  version: "v41.1",
  source: "generated-js-bridge",
  generatedAt: new Date().toISOString(),
  rule: "Noelle usa Loadfile rápido. Outros modelos usam viewers separados. Manifest também é injetado por JS para evitar falha de fetch JSON.",
  avatars,
  scenes
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });

fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2), "utf8");
fs.writeFileSync(OUT_JS, "window.__NOELLE_MODEL_MANIFEST_V41_1 = " + JSON.stringify(manifest, null, 2) + ";\n", "utf8");

console.log("[manifest-v41.1] avatars: " + avatars.length);
console.log("[manifest-v41.1] scenes: " + scenes.length);
for (const avatar of avatars) {
  console.log((avatar.exists ? "[OK] " : "[MISSING] ") + avatar.kind + " " + avatar.path);
}
for (const scene of scenes) {
  console.log((scene.exists ? "[OK] " : "[MISSING] ") + scene.kind + " " + scene.path);
}