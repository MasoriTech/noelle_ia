
(() => {
const shells = document.querySelectorAll("#avatarShell");
if (shells.length <= 1) return;

for (let i = 1; i < shells.length; i++) {
  shells[i].remove();
}

console.log("[avatar-guard-v20] removed duplicate avatarShell");
})();
