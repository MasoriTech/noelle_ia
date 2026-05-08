# Erros comuns

## STT backend não configurado

Configure `NOELLE_STT_CMD` ou use modo texto.

## Ollama não respondeu

Abra o Ollama e confirme o modelo configurado em `config/models_config.json`.

## App abriu branco

Rode:

```bat
npm run diagnostico:v20
```

## TTS falhou

A resposta deve continuar aparecendo em texto. Voz nunca deve derrubar o chat.
