# Noelle/Yoru V19.8.20 — Avatar compacto + importar avatar

Micro-patch pequeno para a aba Avatar.

## O que faz

- reduz a altura do card/preview do Avatar;
- adiciona botão **Importar avatar**;
- adiciona botão **Acionar avatar**;
- copia `.vrm`/`.glb` importado para `src/assets/avatars`;
- atualiza `src/assets/avatar_manifest.json`;
- não mexe na câmera 3D;
- não mexe no carregamento VRM;
- não usa MutationObserver;
- não remove DOM.

## Como aplicar

1. Copie para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar Avatar compacto + importar avatar`.
4. Rode `[2]` diagnóstico.
5. Abra pela opção `[1]`.

## Observação

O botão **Acionar avatar** tenta clicar no botão existente de salvar avatar padrão.
Se não encontrar, ele salva o caminho/nome em `localStorage` e dispara um evento interno.
