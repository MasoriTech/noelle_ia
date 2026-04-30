# Noelle/Yoru V19.8.22 — Main performance modular

Fase 1 de performance/manutenção.

## Por que começar pelo main.js

O `main.js` atual concentra boot do Electron, estado, logs, Ollama, janelas, IPC e utilitários. Por isso a primeira melhoria segura é extrair partes pequenas e reduzir pontos frágeis sem mexer na UI.

## O que este pack faz

- cria `src/main/performance/ollama_http_agent_v19_8_22.cjs`;
- cria `src/main/performance/safe_json_v19_8_22.cjs`;
- adiciona HTTP keep-alive no `ollamaRequest`;
- troca `writeJson` por escrita JSON atômica;
- adiciona cache curto de 1 segundo em `loadState`/`saveState`;
- atualiza `package.json`;
- mantém `iniciar.bat` único.

## O que NÃO faz

- não mexe no Avatar;
- não mexe em Chat;
- não mexe na aba Configurações;
- não mexe no Room;
- não reescreve a UI.

## Aplicação

1. Copie o pack para a raiz.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar performance modular no main.js`.
4. Rode `[2]` diagnóstico.
5. Inicie pela opção `[1]`.
