
const fs = require("fs");
const path = require("path");

const controls = "src/controls.html";
const recover = "src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js";

if (fs.existsSync(recover)) {
  fs.writeFileSync(recover, "// disabled by runtime v20\n");
  console.log("stream recover disabled");
}

if (fs.existsSync(controls)) {
  let html = fs.readFileSync(controls, "utf8");

  if (!html.includes("noelle_tabs_runtime_v20.js")) {
    html = html.replace("</body>",
      '<script src="./renderer/modules/noelle_tabs_runtime_v20.js"></script>\n' +
      '<script src="./renderer/modules/noelle_avatar_mount_guard_v20.js"></script>\n</body>'
    );
  }

  fs.writeFileSync(controls, html);
  console.log("runtime injected into controls.html");
}

console.log("patch v20 applied");
