# Stream IA — V19.8.32 Segment Recorder

## Objetivo

Preparar a próxima etapa de transcrição sem chamar STT ainda.

## O que faz

Grava em memória o trecho de áudio entre:

```txt
noelle-stream-vad-start-v19831
```

e:

```txt
noelle-stream-vad-finish-v19831
```

Depois emite:

```txt
noelle-stream-segment-ready-v19832
```

com:

```txt
Blob
blobUrl
durationMs
sizeBytes
mimeType
```

## O que não faz

- não salva em disco;
- não transcreve;
- não chama IA;
- não gera voz;
- não liga microfone automaticamente.

## Como testar

1. Abrir aba Stream.
2. Clicar em Iniciar escuta.
3. Falar algo.
4. Esperar o VAD finalizar o trecho.
5. Ver painel "Trecho de áudio".
6. O áudio gravado deve aparecer no player.
7. Clicar em play para ouvir o trecho.

## Próxima fase

V19.8.33:
- preparar ponte local para STT;
- ainda respeitar StreamGuard;
- não responder automaticamente sem pergunta direcionada.
