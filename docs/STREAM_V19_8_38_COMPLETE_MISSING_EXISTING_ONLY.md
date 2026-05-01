# Stream V19.8.38 — Complete Missing Existing Only

## Fluxo novo

```txt
VAD detecta fala
↓
segment recorder gera Blob
↓
Pipeline guarda último Blob
↓
Transcrever trecho
↓
preload -> main -> STT backend local
↓
texto volta para UI
↓
StreamGuard decide
↓
noelleAPI.chat
↓
resposta aparece
↓
noelleAPI.speak se usuário pedir
```

## Backend STT

O pack não baixa modelo nem executável.
Ele prepara a ponte para usar backend local.

Config por ambiente:

```bat
set NOELLE_STT_CMD=C:\tools\whisper\whisper-cli.exe
set NOELLE_STT_ARGS=-f {input} -otxt -of {outputBase}
```

Ou por arquivo:

```txt
config/stream_stt_v19_8_38.json
```
