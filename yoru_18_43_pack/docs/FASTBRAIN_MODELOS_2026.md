# FASTBrain - escolhas de modelo

## Padrão recomendado
`Qwen3.5 0.8B Q4_K_M` continua sendo o padrão por latência baixa.

## Alternativa mais forte
`Qwen3 1.7B Q4_K_M` pode ser testado como FAST+ se o PC aguentar.

## Alternativa experimental
`Gemma 3 1B` pode ser rápido, mas algumas quantizações GGUF/QAT tiveram relatos de metadados e token de fim de turno incorretos. Use apenas se o GGUF estiver corrigido.

## Como trocar
Dentro do chat:

```txt
/fastbrain turbo
/fastbrain plus
/fastbrain gemma
```

Ou no menu:

```txt
Modelos / KoboldCpp > Aplicar FastBrain
```

Depois gere os BATs se o caminho do modelo mudou.
