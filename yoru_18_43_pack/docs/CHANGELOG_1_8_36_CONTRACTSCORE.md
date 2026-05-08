# Yoru Bridge Modern 1.8.36 - ContractsCore

Foco: contratos de resposta por intenção para reduzir tokens desperdiçados e impedir explicações fora do pedido.

## Novos comandos

- `/contratos status`
- `/contratos exemplos`
- `/contratos testar texto`
- `/contratos on` / `/contratos off`
- `/contratos modo rigido` / `/contratos modo normal`
- `/contratos debug on` / `/contratos debug off`

## Contratos

- `list_only`: lista numerada sem mini-resumo de cada item.
- `yes_no_fact`: começa com Sim/Não/Depende e ressalva curta.
- `date_fact`: começa pela data.
- `detail_requested`: explica somente o item pedido.
- `comparison`: compara somente os itens pedidos.
- `how_to`: passo a passo prático.
- `code_debug`: causa provável e correção mínima.
- `short_fact`: fato direto.
- `direct`: resposta direta sem extras.

## Compatibilidade

`/scope` continua funcionando como alias de escopo, agora apoiado pelo ContractsCore.
