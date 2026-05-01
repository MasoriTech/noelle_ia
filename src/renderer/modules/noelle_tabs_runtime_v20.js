
(() => {
"use strict";

const PAGE_SELECTOR = ".page[data-page]";
const BTN_SELECTOR = ".nav-item[data-target]";

function pages() {
  return [...document.querySelectorAll(PAGE_SELECTOR)];
}

function buttons() {
  return [...document.querySelectorAll(BTN_SELECTOR)];
}

function hideAll() {
  pages().forEach(p => {
    p.classList.remove("active");
    p.hidden = true;
  });
}

function activate(name) {
  const page = document.querySelector(`.page[data-page="${name}"]`);
  if (!page) return;

  hideAll();
  page.hidden = false;
  page.classList.add("active");

  buttons().forEach(b => {
    b.classList.toggle("active", b.dataset.target === name);
  });

  console.log("[tabs-runtime-v20] active:", name);
}

function dedupeSidebar() {
  const seen = new Set();

  buttons().forEach(btn => {
    const key = btn.dataset.target;
    if (seen.has(key)) {
      btn.remove();
      console.log("[tabs-runtime-v20] removed duplicate:", key);
    } else {
      seen.add(key);
    }
  });
}

document.addEventListener("click", e => {
  const btn = e.target.closest(BTN_SELECTOR);
  if (!btn) return;
  activate(btn.dataset.target);
});

window.addEventListener("DOMContentLoaded", () => {
  dedupeSidebar();
  activate("home");
});

})();
