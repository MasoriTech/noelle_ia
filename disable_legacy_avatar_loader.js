
const fs = require("fs");
const path = require("path");

const controlsPath = path.join("src", "controls.html");

if (!fs.existsSync(controlsPath)) {
  console.log("controls.html not found.");
  process.exit(0);
}

let html = fs.readFileSync(controlsPath, "utf8");

if (html.includes("noelle_avatar_tab_v19_8_2.js")) {

  html = html.replace(
    /<script[^>]*noelle_avatar_tab_v19_8_2\.js[^>]*><\/script>/g,
    "<!-- legacy avatar loader removed by avatar_legacy_cleanup_v27 -->"
  );

  console.log("legacy avatar loader disabled in controls.html");

}

if (!html.includes("avatar_legacy_blocker_v27.js")) {

  html = html.replace(
    "</body>",
    '<script src="./runtime/avatar_legacy_blocker_v27.js"></script>\n</body>'
  );

  console.log("runtime blocker injected");

}

fs.writeFileSync(controlsPath, html);

console.log("avatar legacy cleanup complete");
