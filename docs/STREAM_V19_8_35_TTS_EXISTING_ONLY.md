# Stream V19.8.35 — TTS Existing Only

## Regra

Não criar Stream nova. Apenas adicionar runtime de TTS por cima da estrutura existente.

## Arquivo novo

```txt
src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js
```

## Ponte usada

```js
window.noelleAPI.speak(text)
```

## Segurança operacional

- Auto voz começa desligado.
- Botão manual “Falar resposta” funciona se existir resposta válida.
- Não fala textos placeholder.
- Se o mute da Stream estiver ligado, não fala.
- Se noelleAPI.speak não existir, mostra aviso em vez de quebrar.

## Próximo passo depois deste

A próxima etapa pode ser:
- histórico de turnos da Stream
- salvar pergunta/resposta
- delay anti-interrupção
- TTS por fila
