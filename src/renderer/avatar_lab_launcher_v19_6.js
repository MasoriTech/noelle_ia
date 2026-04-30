(() => {
  "use strict";

  const BUTTON_ID = "noelle-avatar-lab-v19-6-button";
  const STYLE_ID = "noelle-avatar-lab-v19-6-launcher-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        right: 18px;
        bottom: 132px;
        z-index: 2147483300;
        border: 1px solid rgba(255,83,136,.52);
        border-radius: 999px;
        padding: 10px 14px;
        color: transparent;
        background: linear-gradient(135deg,#ff477e,#8b5cf6);
        box-shadow: 0 14px 40px rgba(0,0,0,.34);
        font-weight: 900;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function openLab() {
    const url = new URL("./avatar_lab_v19_6.html", document.baseURI).href;
    window.open(url, "noelle-avatar-lab-v19-6", "width=1180,height=780");
  }

  function start() {
    if (document.getElementById(BUTTON_ID)) return;
    injectStyle();
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.textContent = "🧪 Avatar Lab";
    btn.title = "Abrir Noelle Avatar Lab V19.6";
    btn.addEventListener("click", openLab);
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.NoelleAvatarLabV196 = { open: openLab };
})();