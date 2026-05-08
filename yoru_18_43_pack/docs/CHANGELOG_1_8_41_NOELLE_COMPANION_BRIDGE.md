# 1.8.42 - Noelle Embedded Chat

- Adicionada API local HTTP/JSON em `src/yoru_bridge/api/server.py`.
- Novo modo CLI: `python -m yoru_bridge api`.
- Novo menu `[17] Local API - Noelle Companion substituir chat`.
- Novos comandos: `/api status`, `/api docs`, `/api manifest`, `/api token gerar`, `/noelle status`.
- Endpoints: `/health`, `/status`, `/manifest`, `/chat`, `/command`, `/state`, `/events`, `/tts/say`, `/avatar/emote`.
- `YoruApp.say()` agora guarda `last_reply` para respostas JSON da API.
- Incluídos exemplos JS para integrar o Electron/Noelle Companion.
- Mantidas as skills existentes: BrowserIntent, AppIntent, ContractsCore, DownloadCenter, TTSControl e AvatarBridge.
