const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = ['data/cache'];
for (const rel of targets) {
  const dir = path.join(root, rel);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    console.log('[OK] Limpo: ' + rel);
  }
}
