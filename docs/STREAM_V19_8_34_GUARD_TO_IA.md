# Stream V19.8.34 — Guard to IA Existing Only

Este patch é o próximo passo depois do V19.8.33.

Ele não cria uma aba Stream nova. Ele adiciona só um runtime em cima da Stream existente:

```txt
src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js
```

## Fluxo

```txt
Trecho pronto
→ transcrição V19.8.33
→ StreamGuard
→ se aprovado: noelleAPI.chat
→ resposta aparece em #streamFutureAnswer
```

## Regra

A IA só é chamada se:

```txt
1. a fala chamar Noelle ou Yoru
2. a fala parecer pergunta
```

## TTS

TTS continua desligado nesta fase.
