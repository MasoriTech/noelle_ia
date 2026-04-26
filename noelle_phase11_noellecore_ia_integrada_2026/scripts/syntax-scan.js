const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targets = [
  "src/renderer/avatar_window_app.js",
  "src/renderer/controls_window_app.js",
  "src/renderer/scene.js",
  "src/renderer/ui.js",
  "src/renderer/items.js",
  "src/renderer/config.js",
];

function sanitizeModuleSource(code) {
  return code
    .replace(/^\s*import\s+[^;]+;\s*$/gm, "")
    .replace(/^\s*export\s+/gm, "");
}

const failures = [];
const oks = [];

for (const rel of targets) {
  try {
    const file = path.join(root, rel);
    const raw = fs.readFileSync(file, "utf-8");
    const sanitized = sanitizeModuleSource(raw);
    new Function(sanitized);
    oks.push("OK   " + rel);
  } catch (err) {
    failures.push(`${rel}: ${err.message}`);
  }
}

console.log(oks.join("\n"));
if (failures.length) {
  console.error("\nSyntax scan encontrou problema(s):");
  for (const item of failures) console.error("- " + item);
  process.exit(1);
}
console.log("\nSyntax scan finalizado sem falhas.");
