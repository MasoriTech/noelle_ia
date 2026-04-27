#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.cwd();
const checks = [];
function ok(name, good, detail='') { checks.push({name, good, detail}); }
function read(rel) { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; } }

ok('package.json na raiz', fs.existsSync(path.join(root, 'package.json')));
ok('main.js existe', fs.existsSync(path.join(root, 'main.js')));
ok('src/controls.html existe', fs.existsSync(path.join(root, 'src/controls.html')));
ok('CSS seguro existe', fs.existsSync(path.join(root, 'src/styles/noelle_chat_safe_repair.css')));
ok('janela limpa existe', fs.existsSync(path.join(root, 'tools/noelle_chat_clean/main.cjs')));

const controls = read('src/controls.html');
ok('hotfix visual antigo removido', !/noelle_chat_focus_patch/i.test(controls), /noelle_chat_focus_patch/i.test(controls) ? 'ainda existe referencia ao patch antigo' : '');
ok('CSS seguro injetado no controls.html', /noelle_chat_safe_repair\.css/i.test(controls));

const main = read('main.js');
ok('ensureDir definida', /function\s+ensureDir\s*\(/.test(main) || /(?:const|let|var)\s+ensureDir\s*=/.test(main));
ok('titleBarOverlay nao encontrado no main.js', !/titleBarOverlay/i.test(main), /titleBarOverlay/i.test(main) ? 'se ainda houver sobreposicao, remover manualmente da janela de controls' : '');

function checkOllama() {
  return new Promise(resolve => {
    const req = http.request({ hostname:'127.0.0.1', port:11434, path:'/api/tags', method:'GET', timeout:2500 }, res => {
      let data='';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({online:true, models:(json.models||[]).map(m=>m.name)});
        } catch {
          resolve({online:true, models:[], detail:'resposta nao JSON'});
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', err => resolve({online:false, error:err.message}));
    req.end();
  });
}

(async () => {
  const ollama = await checkOllama();
  ok('Ollama online em 127.0.0.1:11434', !!ollama.online, ollama.online ? ((ollama.models||[]).slice(0,8).join(', ') || 'sem modelos listados') : ollama.error);

  console.log('\nDIAGNOSTICO CHAT IA V4\n');
  for (const c of checks) console.log(`${c.good ? '[OK] ' : '[ERRO]'} ${c.name}${c.detail ? ' - ' + c.detail : ''}`);
  console.log('\nDica: ECONNREFUSED 127.0.0.1:11434 significa que o Ollama esta fechado/offline.\n');
})();
