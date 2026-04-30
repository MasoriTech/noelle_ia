# Noelle V19.8.3 — Resolução + LoadFile

Este patch vem depois da V19.8.2 Aba Avatar Real.

## Objetivo

Corrigir dois problemas observados:

1. Preview com erro de carregamento por caminho/fetch em `file://`.
2. Layout do Avatar grande demais, botões fora da tela, opções não acompanhando a janela reduzida.

## Decisão técnica

- O preview de teste passa a ter uma janela própria aberta por `BrowserWindow.loadFile()`.
- A aba Avatar recebe uma camada responsiva real com CSS Grid/Flex, breakpoints e scroll.
- A opção `[1] Iniciar programa agora` do `iniciar.bat` continua limpa.

## Resoluções adicionadas

- Compacta
- Normal
- Grande
- Foco avatar

## Regras mantidas

- Não mexer nos assets VRM/VRMA/PNG/GLB.
- Não reativar preload visual antigo.
- Não usar `Activate.ps1`.
- Não usar `Set-ExecutionPolicy`.
- Não criar vários `.bat` principais.

## Teste manual

1. Rode `iniciar.bat`.
2. Use `[3] Reparar/aplicar V19.8.3`.
3. Use `[2] Rodar diagnóstico`.
4. Use `[1] Iniciar programa agora`.
5. Abra a aba Avatar.
6. Teste resoluções e reduza a janela.
7. Clique em Preview LoadFile/Preview Teste.
