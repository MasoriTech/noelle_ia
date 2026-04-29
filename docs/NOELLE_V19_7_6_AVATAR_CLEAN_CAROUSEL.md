# Noelle V19.7.6 — Avatar Clean Carousel 2026

Este pack corrige a aba Avatar para virar um seletor visual limpo de personagens.

## Objetivo

A aba Avatar deve ser:

```txt
avatar grande à esquerda
opções à direita
setas embaixo do avatar
```

Sem tela técnica antiga:

```txt
sem BroadcastChannel visível
sem localStorage visível
sem botão Sincronizar Room
sem painel "Preview real do VRM V19.5"
sem botões flutuantes cobrindo as opções
```

## Fluxo correto

```txt
Aba Avatar
  ├─ escolher personagem VRM/GLB com setas
  ├─ salvar avatar padrão
  ├─ abrir Room / Quarto
  ├─ abrir Widget Mode
  └─ abrir Preview / Teste
```

## Arquivos principais

```txt
src/avatar_carousel_v19_7_6.html
src/renderer/avatar_carousel_v19_7_6_app.js
src/renderer/noelle_avatar_clean_tab_v19_7_6.js
src/assets/avatar_manifest.json
scripts/fix_mega_avatar_v19_7_6_2026.cjs
scripts/build_avatar_carousel_v19_7_6_2026.cjs
scripts/diagnostico_mega_avatar_v19_7_6_2026.cjs
iniciar.bat
```

## Como aplicar

```bat
APLICAR_MEGA_CORRECAO_AVATAR_V19_7_6.bat
```

Depois use sempre:

```bat
iniciar.bat
```

## Observação

O script é idempotente: pode rodar mais de uma vez. Ele cria backup em `backups/` antes de alterar arquivos importantes.
