# Noelle/Yoru V19.8.18 — Avatar fit viewport

Microfix pequeno para a aba Avatar caber melhor na altura da janela.

## Problema

A câmera 3D não é o problema. O problema é o tamanho vertical do layout: o card do avatar fica alto demais e obriga scroll para acessar setas/botões.

## O que faz

- marca só a aba Avatar quando ela está ativa;
- limita a altura do preview ao viewport;
- mantém setas/nome visíveis;
- faz o painel lateral rolar por dentro se faltar espaço;
- não remove DOM;
- não usa MutationObserver;
- não mexe nas outras abas.

## Como aplicar

1. Copie para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar fit viewport da aba Avatar`.
4. Rode `[2]` diagnóstico.
5. Abra pela opção `[1]`.
