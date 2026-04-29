(() => {
  "use strict";

  const PATCH_ID = "NOELLE_V19_5_ROOM_SYNC_BRIDGE_2026";
  const STYLE_ID = "noelle-v19-5-room-sync-style";
  const PILL_ID = "noelle-v19-5-room-sync-pill";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PILL_ID} {
        position: fixed;
        right: 18px;
        bottom: 76px;
        z-index: 2147483400;
        border: 1px solid rgba(255,83,136,.42);
        border-radius: 999px;
        padding: 8px 12px;
        color: #fff4fb;
        background: rgba(14,14,25,.90);
        box-shadow: 0 14px 38px rgba(0,0,0,.32);
        font-weight: 800;
        font-size: 13px;
        max-width: 360px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);
  }

  function setPill(text) {
    injectStyle();
    let el = document.getElementById(PILL_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = PILL_ID;
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function consume(message) {
    if (!message || message.source !== "avatar-v19-5") return;

    try {
      localStorage.setItem("noelle.room.avatar.sync.last", JSON.stringify(message, null, 2));
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("noelle:room-avatar-sync", { detail: message }));
    } catch {}

    const payload = message.payload || {};
    if (message.type === "avatar:loaded" || message.type === "avatar:sync-room") {
      const url = payload.url || "avatar";
      setPill(`Avatar sync: ${url.split("/").pop()}`);
      try { window.noelleRoomPlayer?.setAvatar?.(url); } catch {}
      try { window.roomPlayerApi?.setAvatar?.(url); } catch {}
      try { window.noelleRoomV19?.setAvatar?.(url); } catch {}
    }

    if (message.type === "motion:play") {
      const url = payload.url || "motion";
      setPill(`Motion sync: ${url.split("/").pop()}`);
      try { window.noelleRoomPlayer?.playMotion?.(url); } catch {}
      try { window.roomPlayerApi?.playMotion?.(url); } catch {}
    }

    if (message.type === "expression:set") {
      setPill(`Expression sync: ${payload.name || "expression"}`);
      try { window.noelleRoomPlayer?.setExpression?.(payload.name, payload.value); } catch {}
      try { window.roomPlayerApi?.setExpression?.(payload.name, payload.value); } catch {}
    }

    if (message.type === "motion:stop") {
      setPill("Motion sync: parada");
      try { window.noelleRoomPlayer?.stopMotion?.(); } catch {}
      try { window.roomPlayerApi?.stopMotion?.(); } catch {}
    }
  }

  function start() {
    if (window.__NOELLE_V19_5_ROOM_SYNC_STARTED__) return;
    window.__NOELLE_V19_5_ROOM_SYNC_STARTED__ = true;

    setPill("Avatar sync pronto");

    try {
      const ch = new BroadcastChannel("noelle-avatar-room-sync");
      ch.onmessage = (event) => consume(event.data);
    } catch {
      setPill("Avatar sync: BroadcastChannel indisponível");
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== "noelle.avatar.sync.state" || !event.newValue) return;
      try { consume(JSON.parse(event.newValue)); } catch {}
    });

    console.log("[Noelle V19.5] Room Sync Bridge ativo");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__NOELLE_V19_5_ROOM_SYNC_BRIDGE__ = PATCH_ID;
})();