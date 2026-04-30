# Noelle/Yoru V19.8.23a — Log queue fix

Este patch corrige o V19.8.23 quando o padrão exato de `appendLog` não foi encontrado.

## O que faz

- mantém `src/main/performance/log_queue_v19_8_23.cjs`;
- usa um scanner robusto para localizar `function appendLog(...)`;
- substitui a função inteira por uma chamada à fila assíncrona;
- remove o uso de `fs.appendFileSync` dentro de `appendLog`;
- não mexe em UI, Avatar, Room, Chat ou preload.

## Como aplicar

1. Copie o pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Corrigir appendLog para log queue`.
4. Rode `[2]` diagnóstico.
5. Abra pela opção `[1]`.
