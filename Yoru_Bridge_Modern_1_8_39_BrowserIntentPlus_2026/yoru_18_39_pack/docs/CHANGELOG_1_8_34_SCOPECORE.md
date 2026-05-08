# Yoru Bridge Modern 1.8.34 - ScopeCore - 2026

Foco: corrigir o comportamento do THINK/Web Knowledge quando ele responde mais do que foi pedido.

## Mudanças

- Novo `core/answer_scope.py` para classificar formato esperado da resposta.
- Novos comandos `/scope status`, `/scope on`, `/scope off`, `/scope exemplos` e `/scope debug on/off`.
- THINK recebe contrato de escopo no prompt.
- Web Knowledge recebe contrato de escopo e usa mais resultados quando a pergunta é lista/ranking.
- Tokens do THINK agora são ajustados pelo tipo de pergunta: lista/fato usam menos; detalhe permite mais.
- O objetivo não é resumir tudo, e sim responder completo quando pedido e filtrar o que não foi pedido.

## Exemplos esperados

- `top 10 animes de 2026` -> só a lista de 10 nomes.
- `me fale mais do número 4` -> explica o número 4.
- `Palmeiras ganhou mundial?` -> resposta direta com ressalva curta.
- `quando Corinthians foi fundado?` -> data direta.
