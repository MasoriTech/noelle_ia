# Noelle V19.8.7 — Purge Avatar legado

Objetivo: remover do código ativo a tela/carrossel legado que carregava `avatar_carousel_v19_7_6.bundle.js` e gerava a aba/overlay antigo de Avatar.

Este patch não apaga assets VRM, VRMA, PNG, GLB, ícones, Room ou Chat. Ele remove apenas runtimes/bundles legados do Avatar/carrossel.

Arquivos antigos são copiados para `backups/` antes de sair do código ativo.

## Usar

1. Copie o conteúdo do pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Apagar/remover do codigo ativo o Avatar legado V19.7.6`.
4. Rode `[2] Rodar diagnostico V19.8.7`.
5. Inicie com `[1] Iniciar programa agora`.

## Resultado esperado

- Nenhum carregamento de `avatar_carousel_v19_7_6.bundle.js`.
- Nenhum runtime `noelle_avatar_resize_guard_v19_8_3`/`route_guard`/`overlay_killer` ativo.
- A aba Avatar deve ficar com a implementação V19.8.x atual, sem tela velha por cima.
