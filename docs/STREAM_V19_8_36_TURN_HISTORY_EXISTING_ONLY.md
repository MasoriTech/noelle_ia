# Stream V19.8.36 — Turn History Existing Only

## Objetivo

Guardar os turnos da Stream:

```txt
transcrição/pergunta -> resposta da IA
```

sem mexer na estrutura da aba.

## Arquivo novo

```txt
src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js
```

## Como funciona

O runtime observa:
- resposta da IA na tela
- eventos `noelle:stream-ai-reply`
- eventos `noelle:stream-ai-reply-ready`
- eventos de transcrição, quando existirem

E salva turnos úteis em `localStorage`.

## Segurança

Não salva placeholders como:
- “IA ainda não responde”
- “aqui entrará Ollama”
- “pergunta aprovada”

## Próximo passo

Depois disso, o próximo pack pode ser:
- contexto curto para IA
- usar últimos 3 turnos no prompt
- fila anti-interrupção da voz
