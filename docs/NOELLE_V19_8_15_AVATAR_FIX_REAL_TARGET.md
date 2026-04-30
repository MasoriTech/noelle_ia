# Noelle/Yoru V19.8.15 — Avatar fix real target

Este é um microfix mais certeiro para o caso em que V19.8.14 não pegou o arquivo real.

## O que faz

- injeta CSS seguro no `controls.html`;
- limpa fundo branco em HTMLs de avatar/preview;
- varre `src/renderer`, `src/renderer_dist` e `src`;
- tenta corrigir `WebGLRenderer` com `alpha: true`;
- troca `setClearColor` para transparente;
- tenta aplicar A-pose nos arquivos não-minificados com padrão claro de VRM.

## Importante

Ele faz backup antes de alterar e não mexe nas outras abas.
