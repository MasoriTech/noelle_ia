const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const root = process.cwd();
const keep = new Set(['INICIAR.bat']);
const bats = fs.readdirSync(root).filter((name) => name.toLowerCase().endsWith('.bat') && !keep.has(name));
if (!bats.length) {
  console.log('Nenhum .bat extra encontrado na raiz.');
  process.exit(0);
}
console.log('Vou mover estes .bat para backup, sem apagar:');
for (const b of bats) console.log(' - ' + b);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nDigite SIM para confirmar: ', (answer) => {
  if (answer.trim().toUpperCase() !== 'SIM') {
    console.log('Cancelado.');
    rl.close();
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destDir = path.join(root, 'backups', `bats_limpos_${stamp}`);
  fs.mkdirSync(destDir, { recursive: true });
  for (const b of bats) {
    fs.renameSync(path.join(root, b), path.join(destDir, b));
    console.log('Movido:', b);
  }
  console.log('Backup:', path.relative(root, destDir));
  rl.close();
});
