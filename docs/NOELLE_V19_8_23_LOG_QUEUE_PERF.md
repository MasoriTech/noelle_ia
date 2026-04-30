# Noelle/Yoru V19.8.23 — Log queue performance

Fase 2 de desempenho e manutenção do `main.js`.

## Por que este patch

O `main.js` atual usa `appendLog` com escrita síncrona em arquivo (`fs.appendFileSync`). Isso é simples, mas pode travar o main process em momentos de muito log, especialmente quando o disco está lento ou o app está respondendo IPC/IA.

## O que faz

- cria `src/main/performance/log_queue_v19_8_23.cjs`;
- troca `appendLog` para usar fila assíncrona;
- agrupa linhas de log antes de gravar;
- adiciona rotação simples quando o log passa de 2 MB;
- tenta dar flush dos logs em `before-quit`;
- não mexe em UI, Avatar, Chat, Room ou preload.

## Aplicação

1. Copie para a raiz.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar log queue performance`.
4. Rode `[2]` diagnóstico.
5. Inicie pela opção `[1]`.
