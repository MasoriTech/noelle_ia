# Noelle/Yoru V19.8.26 — Auto apply

Este pack automatiza a aplicação do V19.8.26.

## O que faz

- inclui os módulos:
  - `src/main/performance/ollama_http_agent_v19_8_22.cjs`
  - `src/main/performance/safe_json_v19_8_22.cjs`
- inclui:
  - repair V19.8.26
  - diagnóstico V19.8.26
  - script automático `apply_v19_8_26_auto_2026.cjs`
  - `iniciar.bat` atualizado

## Fluxo automático

A opção `[2] Aplicar V19.8.26 automatico` faz:

1. valida se está na raiz;
2. aplica o repair V19.8.26;
3. roda o diagnóstico V19.8.26;
4. mostra `git status -sb`.

Ela não faz push automático.

## Como aplicar

1. Copie tudo para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[2] Aplicar V19.8.26 automatico`.
4. Teste `[1] Iniciar programa agora`.
5. Use `[5] Commit sugerido V19.8.26` se quiser.
6. Depois rode manualmente:

```bat
git push origin main
```
