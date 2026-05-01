# Avatar Runtime V31.1

Correção do load infinito.

Causa:
- O v31 carregava `src/avatar_carousel_v19_7_6.html` dentro de iframe.
- O carousel original espera que `avatarCanvas`, `prevAvatar`, `nextAvatar`, `avatarName`, `avatarFile`, `avatarSelect` e o bundle fiquem no mesmo DOM.
- Dentro do iframe, o bridge/preload e o estado do app podem não estar disponíveis, causando carregamento infinito.

Correção:
- Remover iframe.
- Montar o DOM do carousel direto dentro de `#avatarMount`.
- Carregar `renderer_dist/avatar_carousel_v19_7_6.bundle.js` no DOM principal.
- Manter setas embaixo.
- Manter legacy bloqueado.