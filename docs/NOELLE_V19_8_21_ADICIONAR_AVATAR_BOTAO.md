# Noelle/Yoru V19.8.21 — Botão Adicionar avatar

Este micro-patch adiciona o botão **Adicionar avatar** na aba Avatar.

## O que faz

- adiciona botão **Adicionar avatar** perto de `Recarregar lista`/ações do avatar;
- abre seletor para `.vrm` e `.glb`;
- copia o arquivo para `src/assets/avatars`;
- atualiza `src/assets/avatar_manifest.json`;
- tenta recarregar a lista automaticamente;
- não mexe no renderer 3D;
- não remove DOM;
- não usa observador de DOM.

## Como aplicar

1. Copie para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar botão Adicionar avatar`.
4. Rode `[2]` diagnóstico.
5. Feche e abra pela opção `[1]`.
