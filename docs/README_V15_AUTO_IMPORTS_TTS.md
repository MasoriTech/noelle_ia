# Noelle V15 — Auto imports + TTS essencial

Objetivo: parar de depender de instalação manual para a voz e reconectar assets que existem no repo mas não aparecem na UI.

O `INICIAR.bat` chama o bootstrap antes de abrir a Noelle. O bootstrap:

1. instala dependências npm quando `node_modules` não existe;
2. cria `.venv` e instala Python quando necessário;
3. adiciona `piper-tts` e STT em `requirements.txt`;
4. cria manifests para `expressions`, `motions` e `items` escaneando os arquivos reais;
5. injeta uma ponte visual leve para os assets sem redesenhar a janela inteira;
6. adiciona ponte TTS no preload/main quando possível;
7. cria backup antes de alterar arquivos.

TTS:

- Piper é usado quando houver voz `.onnx` em `tools/noelle_tts/voices/`.
- Enquanto a voz Piper não estiver configurada, o helper usa o TTS nativo do Windows para não deixar a Noelle muda.

Arquivos novos principais:

- `scripts/noelle_bootstrap_v15.cjs`
- `scripts/diagnostico_imports_v15.cjs`
- `tools/noelle_tts/speak_piper.py`
- `src/renderer/noelle_assets_bridge_v15.js`
- `src/styles/noelle_assets_bridge_v15.css`

