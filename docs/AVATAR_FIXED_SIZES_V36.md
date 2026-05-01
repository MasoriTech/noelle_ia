# Avatar Loadfile Fixed Sizes V36

## Tamanhos definidos

| Item | Tamanho |
|---|---|
| Page padding | 12px topo, 18px lados, 14px baixo |
| Root height | calc(100vh - 150px) |
| Root min-height | 540px |
| Header externo | 58px |
| H1 externo | 30px |
| Recarregar/status | 40px |
| Shell preview | 100% do espaço restante |
| Iframe | 100% x 100% |
| Header interno iframe | 40px |
| Botões internos iframe | 30px |
| Canvas | 100% x 100% |
| Nota inferior | display none |

## Observação

Este patch mexe no CSS externo e no CSS interno do iframe.
Por isso ele altera o tamanho real, não só o container.