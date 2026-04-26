const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "src/renderer_dist/launcher.bundle.js",
  "src/renderer_dist/controls.bundle.js",
  "src/renderer_dist/avatar.bundle.js",
];

let failed = 0;
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error("FAIL bundle ausente:", rel);
    failed += 1;
    continue;
  }
  const size = fs.statSync(full).size;
  if (size < 1024) {
    console.error("FAIL bundle muito pequeno:", rel, size);
    failed += 1;
    continue;
  }
  console.log("OK  ", rel, size, "bytes");
}

if (failed) process.exit(1);
console.log("Bundles validados.");
