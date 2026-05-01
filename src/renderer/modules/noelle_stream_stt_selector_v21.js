
(() => {

async function loadConfig() {
  try {
    const r = await fetch("config/stt_config.json");
    return await r.json();
  } catch {
    return { engine: "auto", model: "small" };
  }
}

function buildSelector(container) {

  const engineSelect = document.createElement("select");
  ["auto","faster-whisper","whisper.cpp","openai-whisper"]
    .forEach(e=>{
      const o=document.createElement("option");
      o.value=e;
      o.textContent=e;
      engineSelect.appendChild(o);
    });

  const modelSelect = document.createElement("select");
  ["tiny","base","small","medium","large-v3"]
    .forEach(m=>{
      const o=document.createElement("option");
      o.value=m;
      o.textContent=m;
      modelSelect.appendChild(o);
    });

  container.appendChild(document.createTextNode("STT Engine: "));
  container.appendChild(engineSelect);
  container.appendChild(document.createElement("br"));

  container.appendChild(document.createTextNode("STT Model: "));
  container.appendChild(modelSelect);

  engineSelect.onchange = save;
  modelSelect.onchange = save;

  async function save() {
    await fetch("config/stt_config.json", {
      method: "POST",
      body: JSON.stringify({
        engine: engineSelect.value,
        model: modelSelect.value
      })
    });
  }

}

window.addEventListener("DOMContentLoaded", async () => {

  const target = document.getElementById("streamLastTranscript");
  if (!target) return;

  const box = document.createElement("div");
  box.style.marginTop = "8px";

  target.parentElement.insertBefore(box, target);

  buildSelector(box);

});

})();
