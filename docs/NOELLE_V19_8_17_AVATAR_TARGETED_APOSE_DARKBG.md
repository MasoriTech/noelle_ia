# Noelle/Yoru V19.8.17 — Avatar targeted A-pose + dark background

Microfix específico para o alvo encontrado pelo diagnóstico V19.8.16:

- `src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js`
- `src/renderer/avatar_carousel_preview_v19_8_2_app.mjs`

## O que corrige

- troca fundo branco/transparente por fundo escuro Yoru Ember no renderer real;
- aplica A-pose leve depois do VRM carregar;
- injeta CSS/guard limitado só para escurecer pais do canvas do Avatar;
- não mexe em Configurações, Chat, Room ou Inventário.
