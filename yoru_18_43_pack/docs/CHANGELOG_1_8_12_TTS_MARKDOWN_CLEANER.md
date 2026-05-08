# Yoru Bridge 1.8.12 - TTS Markdown Cleaner

## Problema

Quando o modelo respondia com Markdown, principalmente `**negrito**`, o Edge TTS podia falar “asterisco asterisco”.

## Correção

- Sanitização de TTS reforçada em `utils/text.py`.
- Remoção de `**`, `*`, `_`, crases, cabeçalhos, links Markdown e marcadores de lista antes da fala.
- Prompts pedem para a Yoru evitar Markdown decorativo.
- Novo comando: `/voz semmarkdown`.

## Observação

A tela ainda pode mostrar texto comum, mas o áudio deve ser limpo.
