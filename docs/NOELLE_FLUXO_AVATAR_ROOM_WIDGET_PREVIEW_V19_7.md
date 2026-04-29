# Noelle V19.7 — Fluxo Avatar / Room / Widget / Preview

## Regra principal

A aba Avatar da janela principal serve para selecionar e visualizar o avatar. Ela não deve virar a Room.

## Os 3 modos

1. **Room / Quarto**
   - Abre `room.html` pela API `window.noelleRoom.open()`.
   - A Room é responsável por cenário, objetos GLB, layout e interações do ambiente.

2. **Widget Mode**
   - Abre a janela transparente `avatar_view.html` pela API `window.noelleAPI.openAvatar()`.
   - É o modo sem fundo, flutuante, parecido com o exemplo visual enviado.

3. **Preview / Teste**
   - Abre `avatar_lab_v19_6.html` em janela separada.
   - Serve para testar VRM, câmera, pose, expressão e VRMA sem aplicar estado real na Room.

## Separação de responsabilidade

- Janela principal: chat, avatar, configurações e sobre.
- Aba Avatar: seleção do avatar e escolha do modo.
- Room: quarto, objetos e interações reais.
- Widget: avatar sem fundo.
- Preview/Teste: laboratório seguro, sem sincronizar emotions/expressions para a Room.

## Arquivos adicionados

- `src/renderer/avatar_mode_router_v19_7.js`
- `scripts/apply_avatar_modes_v19_7_2026.cjs`
- `scripts/diagnostico_avatar_modes_v19_7_2026.cjs`
