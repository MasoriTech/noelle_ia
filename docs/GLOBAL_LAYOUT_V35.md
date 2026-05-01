# Global Layout Runtime V35

## Regra principal

Layout global controla tamanho.
Páginas só declaram contrato.

## Contratos

- `home`: scroll
- `avatar`: fill
- `chat`: fill
- `stream`: fill
- `settings`: scroll
- `inventory`: scroll
- `emotes`: scroll
- `about`: scroll

## Variáveis

`config/ui_layout.json` controla:

- sidebarWidth
- topbarHeight
- pagePaddingX
- pagePaddingY
- contentMaxWidth
- scale

## O que este pack não faz

Não troca renderer, não troca avatar, não mexe em STT, não mexe em memória.