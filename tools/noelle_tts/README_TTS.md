# TTS da Noelle

O `INICIAR.bat` instala o motor `piper-tts` no `.venv`.

Para voz Piper real, coloque um arquivo `.onnx` e o `.onnx.json` correspondente em:

```txt
tools/noelle_tts/voices/
```

Enquanto não houver voz Piper, o app usa fallback local do Windows SAPI para não ficar mudo.
