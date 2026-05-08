# Arquitetura Yoru Bridge 1.8

```txt
src/yoru_bridge/
├─ app.py
├─ config.py
├─ menu.py
├─ core/
│  ├─ router.py
│  ├─ prompts.py
│  └─ local_responses.py
├─ models/
│  ├─ kobold_client.py
│  └─ router.py
├─ voice/
│  ├─ tts.py
│  ├─ stt.py
│  └─ stream.py
├─ skills/
│  └─ browser.py
├─ storage/
│  └─ vault.py
└─ utils/
   ├─ text.py
   └─ datetime_pt.py
```

## Fluxo Chat Stream

```txt
microfone
↓
VAD por energia
↓
grava trecho de voz
↓
Faster-Whisper tiny/int8
↓
filtro de intenção
↓
Yoru FAST/THINK
↓
Edge TTS
↓
cooldown anti-eco
```
