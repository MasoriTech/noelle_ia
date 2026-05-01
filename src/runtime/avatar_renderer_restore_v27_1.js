
(() => {
"use strict";

console.log("[avatar-renderer-restore] ensuring modern VRM renderer active");

function injectRenderer(){

  if(window.__AVATAR_FILELOAD_RENDERER_ACTIVE__){
    console.log("[avatar-renderer-restore] renderer already active");
    return;
  }

  const script = document.createElement("script");

  script.type = "module";
  script.src = "./renderer/avatar_loadfile_preview_v19_8_3_app.mjs";

  script.onload = () => {
    console.log("[avatar-renderer-restore] modern renderer loaded");
    window.__AVATAR_FILELOAD_RENDERER_ACTIVE__ = true;
  };

  document.body.appendChild(script);

}

window.addEventListener("DOMContentLoaded", injectRenderer);

})();
