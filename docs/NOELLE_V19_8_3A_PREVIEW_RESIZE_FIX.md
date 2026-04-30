# Noelle V19.8.3a — Fix Preview LoadFile + Resize

Este patch corrige exatamente os 2 erros do diagnóstico V19.8.3:

1. `preload.js não contém: API openAvatarPreviewLoadFile`
2. `noelle_avatar_resize_guard_v19_8_3.js não contém: controle por resize`

## Como aplicar

1. Copie todo o conteúdo desta pasta para a raiz do projeto `noelle_ia`.
2. Rode `iniciar.bat`.
3. Escolha `[3] Reparar/aplicar V19.8.3a`.
4. Depois escolha `[2] Rodar diagnostico V19.8.3a`.
5. Se passar, use `[1] Iniciar programa agora`.

## O que ele preserva

- Chat IA
- Room
- Widget/avatar VRM
- motions VRMA
- expressions PNG
- items GLB
- preload limpo sem UI antiga
- um único `iniciar.bat`

## Nota

Este patch não redesenha a aba Avatar; ele fecha a correção estrutural da resolução e do Preview LoadFile.
