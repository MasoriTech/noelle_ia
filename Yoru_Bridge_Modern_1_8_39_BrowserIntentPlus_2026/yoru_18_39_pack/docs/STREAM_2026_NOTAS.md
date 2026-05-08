# Chat Stream - Notas

O modo Stream desta versão é experimental e leve para PC antigo:

- usa VAD por energia, sem modelo VAD pesado por padrão;
- usa Faster-Whisper tiny/int8 se instalado;
- grava turnos curtos;
- usa wake word e filtro de intenção;
- aplica cooldown depois do TTS para evitar eco.

Configurações principais ficam em `config.json` dentro de `stream`.
