const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const app = path.join(ROOT, "src", "renderer", "avatar_loadfile_preview_v19_8_3_app.mjs");

function log(msg) {
  console.log("[avatar-preview-query-v39.7] " + msg);
}

if (!fs.existsSync(app)) {
  log("app do preview não encontrado; troca por query ficará dependente do preview atual");
  process.exit(0);
}

let source = fs.readFileSync(app, "utf8");

if (source.includes("NOELLE_AVATAR_QUERY_V39_7")) {
  log("suporte a query já existe");
  process.exit(0);
}

const backup = app + ".bak_query_v39_7";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(app, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

const helper = `
/* NOELLE_AVATAR_QUERY_V39_7 */
const __NOELLE_AVATAR_QUERY_V39_7 = (() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("avatar") || params.get("vrm") || params.get("model") || "";
  } catch {
    return "";
  }
})();

const __NOELLE_DEFAULT_AVATAR_V39_7 = "assets/Noelle.vrm";
const __NOELLE_ACTIVE_AVATAR_V39_7 = __NOELLE_AVATAR_QUERY_V39_7 || __NOELLE_DEFAULT_AVATAR_V39_7;

window.addEventListener("message", (event) => {
  const data = event && event.data ? event.data : {};
  if (!data || data.source !== "avatar-v39.7") return;

  const clickFirst = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && typeof el.click === "function") {
        el.click();
        return true;
      }
    }
    return false;
  };

  if (data.action === "fit") clickFirst(["#btnFit", "[data-action='fit']", "button[title*='Enquadrar']"]);
  if (data.action === "reset") clickFirst(["#btnReset", "[data-action='reset']", "button[title*='Reset']"]);
});
`;

source = helper + "\n" + source;

const literalPatterns = [
  /(["'])assets\/Noelle\.vrm\1/g,
  /(["'])src\/assets\/Noelle\.vrm\1/g,
  /(["'])\.\/assets\/Noelle\.vrm\1/g
];

let replacements = 0;
for (const pattern of literalPatterns) {
  source = source.replace(pattern, () => {
    replacements += 1;
    return "__NOELLE_ACTIVE_AVATAR_V39_7";
  });
}

fs.writeFileSync(app, source, "utf8");
log("suporte a ?avatar= aplicado; literais substituídos: " + replacements);