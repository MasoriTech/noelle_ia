# Stream V19.8.39 — STT Backend Setup

## Por que apareceu o erro

A mensagem:

```txt
STT backend não configurado. Configure NOELLE_STT_CMD ou config/stream_stt_v19_8_38.json
```

significa que a parte de captura está funcionando, mas falta indicar qual programa local faz a transcrição.

## Caminho recomendado

Coloque o executável aqui:

```txt
tools/whisper/whisper-cli.exe
```

Depois rode:

```bat
CONFIGURAR_STT.bat
```

## Arquivo de configuração

```txt
config/stream_stt_v19_8_39.json
```

Exemplo:

```json
{
  "enabled": true,
  "command": "tools/whisper/whisper-cli.exe",
  "args": ["-f", "{input}", "-otxt", "-of", "{outputBase}"]
}
```

## O que este pack não faz

Ele não baixa modelo STT e não baixa executável.
Ele só configura e conecta o backend local.
