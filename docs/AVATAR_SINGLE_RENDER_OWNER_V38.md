# Avatar Single Render Owner V38

## Problema

A aba Avatar estava sendo controlada por múltiplos scripts:
- restore loadfile
- size patches
- carousel patches
- legacy blockers
- layout runtimes

Isso criava conflito.

## Solução

Um único arquivo manda na aba:

`src/renderer/pages/avatar/avatar_render_owner_v38.js`

Ele é o único responsável por renderizar a janela externa.
O iframe interno continua apontando para o Loadfile funcional.

## Regra

Não adicionar outro script de Avatar em `controls.html`.
Qualquer ajuste de tamanho deve ser feito dentro do owner v38.