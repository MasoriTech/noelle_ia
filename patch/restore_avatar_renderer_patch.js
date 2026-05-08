
const fs = require("fs");
const path = require("path");

const controls = path.join("src","controls.html");

if(!fs.existsSync(controls)){
  console.log("controls.html not found");
  process.exit(0);
}

let html = fs.readFileSync(controls,"utf8");

if(!html.includes("avatar_renderer_restore_v27_1.js")){

  html = html.replace(
    "</body>",
    '<script src="./runtime/avatar_renderer_restore_v27_1.js"></script>\n</body>'
  );

  console.log("modern avatar renderer runtime injected");

}

fs.writeFileSync(controls, html);

console.log("avatar renderer restore complete");
