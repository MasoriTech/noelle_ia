# Noelle/Yoru V19.8.12 — Stop Repeated Text

Este patch remove os runtimes visuais agressivos que ficavam repetindo texto/painel na interface.

## O que muda

- Remove referências ativas dos runtimes V19.8.10/11/11a/11b/11c/11d que podiam reinjetar texto.
- Instala apenas:
  - `noelle_static_theme_v19_8_12.css`
  - `noelle_overlay_guard_v19_8_12.js`
- O guard não usa `MutationObserver`.
- O guard não cria painel/texto.
- O guard não remove containers grandes.
- O `iniciar.bat` continua único; opção [1] apenas inicia.

## Como aplicar

1. Copie o pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Corrigir texto repetindo / remover runtime agressivo`.
4. Rode `[2]` diagnóstico.
5. Feche e abra pela opção `[1]`.
