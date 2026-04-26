const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let failed = 0;

function ok(msg) { console.log("OK  ", msg); }
function fail(msg) { console.error("FAIL", msg); failed += 1; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf-8"); }

function duplicateIds(html) {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1);
}

function expectIncludes(text, needle, label) {
  if (text.includes(needle)) ok(label);
  else fail(label + " ausente");
}

try {
  const controlsHtml = read("src/controls.html");
  const launcherHtml = read("src/launcher_view.html");
  const avatarHtml = read("src/avatar_view.html");
  const controlsJs = read("src/renderer/controls_window_app.js");
  const avatarJs = read("src/renderer/avatar_window_app.js");
  const itemsJs = read("src/renderer/items.js");
  const uiJs = read("src/renderer/ui.js");
  const preloadJs = read("preload.js");
  const mainJs = read("main.js");
  const configJs = read("src/renderer/config.js");
  const pkg = JSON.parse(read("package.json"));

  for (const [name, html] of [["controls", controlsHtml], ["launcher", launcherHtml], ["avatar", avatarHtml]]) {
    const dups = duplicateIds(html);
    if (dups.length) fail(`${name}: IDs duplicados: ${dups.map(([id, c]) => `${id}x${c}`).join(", ")}`);
    else ok(`${name}: sem IDs duplicados`);
  }

  expectIncludes(controlsHtml, 'id="inventoryGrid"', "inventário principal");
  expectIncludes(controlsHtml, 'id="inventoryGridAlt"', "aba Inventário preenchida");
  expectIncludes(controlsHtml, 'id="motionCarouselTrack"', "emotes principais");
  expectIncludes(controlsHtml, 'id="motionCarouselTrackAlt"', "aba Emotes preenchida");
  expectIncludes(controlsHtml, 'id="themeNoelleBtn"', "botão tema Noelle");
  expectIncludes(controlsHtml, 'id="themeLightBtn"', "botão tema Branco");
  expectIncludes(controlsHtml, "themeNoelleClassicBtn", "botão tema Noelle clássico");
  expectIncludes(controlsHtml, "noelle_classic", "opção tema Noelle clássico");
  expectIncludes(configJs, 'theme: "noelle_classic"', "tema clássico é padrão");
  expectIncludes(controlsHtml, "Sobre o projeto Noelle", "aba Sobre com informações do projeto");
  expectIncludes(controlsHtml, "clearAvatarItemsBtn", "botão remover itens do avatar");
  expectIncludes(launcherHtml, 'id="avatarRoster"', "launcher tem grade de avatares");
  expectIncludes(launcherHtml, "party-grid", "launcher tem seleção estilo party");
expectIncludes(launcherHtml, 'id="exportAvatarBtn"', "launcher tem botão exportar avatar");
  expectIncludes(launcherHtml, "./styles/responsive.css", "launcher carrega CSS responsivo");
  expectIncludes(controlsHtml, "./styles/responsive.css", "controles carregam CSS responsivo");
  expectIncludes(avatarHtml, "./styles/responsive.css", "avatar carrega CSS responsivo");
  const responsiveCss = read("src/styles/responsive.css");
  expectIncludes(responsiveCss, "auto-fit", "CSS responsivo usa auto-fit");
  expectIncludes(responsiveCss, "minmax", "CSS responsivo usa minmax");
  expectIncludes(responsiveCss, "clamp(", "CSS responsivo usa clamp");
  expectIncludes(responsiveCss, "container-type", "CSS responsivo usa container queries");
  expectIncludes(responsiveCss, "prefers-reduced-motion", "CSS responsivo respeita reduzir movimento");
expectIncludes(responsiveCss, "Fase 9", "CSS responsivo inclui correção de sliders");






  expectIncludes(controlsJs, "controlManager.unequip(item.id)", "Desequipar atualiza estado dos controles");
  expectIncludes(controlsJs, 'sendAvatarCommand({ type: "unequipItem"', "Desequipar envia comando ao avatar");
  expectIncludes(controlsJs, "controlManager.equip(item, entry.slot)", "Equipar atualiza estado dos controles");
  expectIncludes(itemsJs, 'actionType: "unequip"', "ação de desequipar sem callback quebrado");
  expectIncludes(uiJs, "inventoryGridAlt", "UI renderiza inventário alternativo");
  expectIncludes(uiJs, "motionCarouselTrackAlt", "UI renderiza emotes alternativos");
  expectIncludes(itemsJs, "two_hands", "modo duas mãos no inventário");
  expectIncludes(itemsJs, "Usar em duas mãos", "ação Usar em duas mãos");
  expectIncludes(itemsJs, "applyTwoHandPose", "pose especial para duas mãos");
  expectIncludes(controlsJs, 'slot === "two_hands"', "controles limpam conflitos de duas mãos");
  expectIncludes(controlsJs, "themeNoelleClassicBtn", "controles registram tema Noelle clássico");
  expectIncludes(controlsJs, "clearAvatarItems", "controles enviam comando limpar itens");
  expectIncludes(avatarHtml, "theme-noelle-classic", "avatar tem CSS do tema Noelle clássico");
  expectIncludes(avatarJs, "getAvatarOrientationY", "avatar tem correção de orientação por personagem");
  expectIncludes(avatarJs, "baseRotationY", "avatar reaplica rotação base");
  expectIncludes(avatarJs, "refreshAvatarNamePill", "avatar atualiza nome no pill");
  expectIncludes(avatarJs, "getAvatarStateKey", "avatar usa estado por personagem");
  expectIncludes(avatarJs, "rotateAvatar", "avatar aceita comando de girar");
  expectIncludes(controlsHtml, "rotateLeftBtn", "botão girar esquerda existe");
  expectIncludes(controlsHtml, "saveAvatarViewBtn", "botão salvar posição existe");
  expectIncludes(controlsJs, "rotateRightBtn", "controles registram giro direita");
  expectIncludes(avatarJs, "shouldStartCleanForAvatar", "avatar limpa estado ao trocar personagem");

  expectIncludes(preloadJs, "showLauncher", "preload expõe voltar ao menu");
  expectIncludes(preloadJs, "getAvatarLibrary", "preload expõe biblioteca de avatares");
  expectIncludes(preloadJs, "selectAvatarLibrary", "preload expõe seleção de avatar");
expectIncludes(preloadJs, "exportAvatarLibrary", "preload expõe exportação de avatar");
  expectIncludes(mainJs, 'ipcMain.on("show-launcher"', "main recebe voltar ao menu");
  expectIncludes(mainJs, 'ipcMain.handle("get-avatar-library"', "main lista biblioteca de avatares");
  expectIncludes(mainJs, 'ipcMain.handle("select-avatar-library"', "main seleciona avatar");
  expectIncludes(mainJs, "importAvatarToLibrary", "main importa avatar para biblioteca");
  expectIncludes(mainJs, "WINDOW_LAYOUT_VERSION = 6", "layoutVersion atualizada");

  const legacy = [
    "src/avatar_bootstrap.js",
    "src/controls_bootstrap.js",
    "src/renderer/runtime_shims",
    "src/vendor"
  ];
  for (const rel of legacy) {
    if (exists(rel)) fail("legado ainda existe: " + rel);
    else ok("sem legado: " + rel);
  }

  if (pkg.scripts["prepare-runtime-shims"]) fail("script legado prepare-runtime-shims ainda existe");
  else ok("sem script legado prepare-runtime-shims");

  if (pkg.scripts["copy:vendor"]) fail("script legado copy:vendor ainda existe");
  else ok("sem script legado copy:vendor");

} catch (err) {
  fail("checkup falhou: " + err.stack);
}

if (failed) {
  console.error(`\nCheckup encontrou ${failed} problema(s).`);
  process.exit(1);
}

console.log("\nCheckup UI/código finalizado sem falhas.");
