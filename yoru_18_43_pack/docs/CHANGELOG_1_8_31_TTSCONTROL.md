# Yoru Bridge Modern 1.8.31 - TTSControl

## Objetivo

Adicionar controle real de playback ao TTS sem trocar a voz principal brasileira feminina.

## Mudanças

- Mantém Edge TTS como engine principal.
- Mantém `pt-BR-FranciscaNeural` como voz padrão.
- Adiciona `pygame` como player interno.
- Adiciona `/tts status`, `/tts diagnostico`, `/tts teste`, `/tts parar`, `/tts dizer`, `/tts player pygame` e `/tts player externo`.
- Adiciona eventos `audio_ready`, `tts_start` e `tts_end` para AvatarBridge.
- RuntimeState agora entra em `speaking` durante a fala.
- `/pararvoz` agora tenta parar pygame antes de mexer em player externo.
- Adiciona `requirements/requirements_tts_control.txt`.

## Observações

Se `pygame` não estiver instalado, a Yoru usa fallback externo quando `pygame_fallback_to_external=true`.
