# Checkup GitHub — Stream incompleta

Base olhada no GitHub antes do patch.

## Incompleto / pendente

1. A página Stream ainda declara fase futura para STT/Ollama/TTS.
2. O VAD fecha trecho com `silenceToFinishMs: 950`, quase 1 segundo.
3. O segment recorder grava trecho em memória, mas não transcreve.
4. O botão antigo de transcrição usa `window.electron.invoke("stream-stt", "last_segment.wav")`; isso é ponte frágil se o preload só expõe `noelleAPI`.
5. O STT selector é uma UI de configuração; o próprio texto diz que o backend real entra depois pelo preload/main.
6. O timer de inferência é simples e ainda solto, criando `#streamInferenceTime` no body se não existir.

## Patch feito agora

Somente VAD:

```txt
silenceToFinishMs = 5000
```

Não mexe em STT/Ollama/TTS neste pack.
