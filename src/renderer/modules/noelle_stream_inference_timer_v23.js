
(() => {

window.startInferenceTimer = function () {
  window.__stt_timer_start = performance.now();
};

window.stopInferenceTimer = function () {
  if (!window.__stt_timer_start) return;
  const elapsed = (performance.now() - window.__stt_timer_start).toFixed(1);
  let el = document.getElementById("streamInferenceTime");
  if (!el) {
    el = document.createElement("div");
    el.id = "streamInferenceTime";
    document.body.appendChild(el);
  }
  el.textContent = "Inference time: " + elapsed + " ms";
};

})();
