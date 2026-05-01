# Noelle/Yoru V19.8.26 — Main performance finish

Este patch fecha os pontos de performance que ficaram incompletos no `main.js`.

## O que corrige

- `writeJson` passa a usar `writeJsonAtomic`;
- `ollamaRequest` passa a usar `agent: OLLAMA_HTTP_AGENT`;
- `loadState` e `saveState` recebem cache curto V19.8.26;
- atualiza `package.json`;
- não mexe em UI, Avatar, Chat, Room, preload, renderer ou assets.

## Como aplicar

Na raiz do projeto:

```bat
node scripts\repair_v19_8_26_main_perf_finish_2026.cjs
node scripts\diagnostico_v19_8_26_main_perf_finish_2026.cjs
```

Depois:

```bat
git status
git add .
git commit -m "Finaliza performance do main"
git push origin main
```
