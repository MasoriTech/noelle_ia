# Yoru Bridge 1.8.19 - Brain Switch

## Objetivo
Permitir trocar o cérebro da Yoru no meio da conversa sem editar `config.json`.

## Novos modos

- `auto` / `ambos`: roteamento normal entre FAST e THINK.
- `fast`: força tudo no Qwen3.5 0.8B.
- `think`: força tudo no Qwen3.5 2B.
- `dual`: FAST gera um rascunho e THINK revisa a resposta final.

## Comandos

```txt
/cerebro
/cerebro auto
/cerebro ambos
/cerebro fast
/cerebro 0.8b
/cerebro think
/cerebro 2b
/cerebro dual
/dual texto
/modelos
/perf
```

## Quando usar

```txt
/cerebro auto   -> padrão recomendado
/cerebro fast   -> quando quiser velocidade ou o THINK estiver pesado
/cerebro think  -> quando quiser qualidade sem usar o 0.8B
/cerebro dual   -> quando quiser resposta melhor e aceitar mais demora
```

## Nota
O modo `dual` é propositalmente mais lento. Ele chama FAST e depois THINK.
