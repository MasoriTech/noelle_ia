# Noelle V19.8.2 — Aba Avatar Real

Esta fase coloca a aba Avatar dentro do renderer principal da janela de controles, sem depender de injeção visual pelo preload.

## Objetivo

- Avatar grande à esquerda.
- Setas embaixo do avatar.
- Opções à direita.
- Carrossel usando `src/assets/avatar_manifest.json`.
- Room / Widget Mode / Preview-Teste separados.
- Sem `BroadcastChannel`, `localStorage` ou “Sincronizar Room” aparecendo como interface técnica.
- Sem reativar runtimes visuais V19.3/V19.5 pelo preload.

## Arquivos principais

```txt
src/renderer/noelle_avatar_tab_v19_8_2.js
src/styles/noelle_avatar_tab_v19_8_2.css
src/avatar_carousel_preview_v19_8_2.html
src/renderer/avatar_carousel_preview_v19_8_2_app.mjs
scripts/build_avatar_preview_v19_8_2_2026.cjs
scripts/repair_v19_8_2_avatar_real_2026.cjs
scripts/diagnostico_v19_8_2_avatar_real_2026.cjs
iniciar.bat
```

## Aplicação

1. Rode `iniciar.bat`.
2. Escolha `[3] Reparar/aplicar Aba Avatar Real V19.8.2`.
3. Rode `[2] Rodar diagnóstico V19.8.2`.
4. Se o bundle não existir, rode `[4] Gerar/regerar bundle do Avatar Preview`.
5. Rode `[1] Iniciar programa agora`.

## Regra importante

A opção `[1]` do `iniciar.bat` continua limpa: ela só inicia o programa.
