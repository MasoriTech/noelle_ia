# Stream IA — V19.8.31 VAD Simple

## Objetivo

Adicionar detecção simples de fala/silêncio na aba Stream.

## Como funciona

O módulo VAD escuta o evento emitido pelo microfone da V19.8.30:

```txt
noelle-stream-audio-level-v19830
```

Ele detecta:

```txt
- possível fala
- fala detectada
- silêncio depois da fala
- trecho finalizado
```

## Regras atuais

- O microfone continua ligando apenas por botão.
- O VAD não grava áudio.
- O VAD não transcreve.
- O VAD não chama Ollama.
- O VAD não gera voz.

## Arquivo novo

```txt
src/renderer/modules/noelle_stream_vad_v19_8_31.js
```

## Eventos emitidos

```txt
noelle-stream-vad-start-v19831
noelle-stream-vad-finish-v19831
noelle-stream-vad-cancel-v19831
```

## Como testar

1. Abrir a aba Stream.
2. Clicar em Iniciar escuta.
3. Falar algo.
4. Ver o painel mudar para "Fala detectada".
5. Parar de falar.
6. Após quase 1 segundo de silêncio, ver "Trecho finalizado".

## Próxima fase

Preparar gravação de trecho para STT, ainda sem mandar para IA automaticamente.
