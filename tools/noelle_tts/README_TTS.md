# Noelle TTS

Este módulo deixa a voz da Noelle pronta no início.

- Instala `piper-tts` via `requirements.txt`.
- Usa Piper se houver uma voz `.onnx` em `tools/noelle_tts/voices/`.
- Se ainda não houver modelo de voz, usa o TTS nativo do Windows como fallback para a Noelle não ficar muda.

Teste manual:

```bat
.venv\Scripts\python.exe tools\noelle_tts\speak_piper.py --status
.venv\Scripts\python.exe tools\noelle_tts\speak_piper.py "Olá, voz da Noelle funcionando."
```
