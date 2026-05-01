# Noelle Stream V19.8.34

Correção cirúrgica para o bug de troca de aba.

## O que este pack faz

- Adiciona `src/renderer/modules/noelle_tab_router_v19_8_34.js`.
- Injeta o router no HTML principal quando encontra `src/index.html`, `index.html` ou `src/renderer/index.html`.
- Reforça cliques em abas com `data-target`, `data-tab`, `data-page`, `aria-controls` ou `href="#aba"`.
- Reativa a aba correta mesmo se a página Stream for criada depois do boot.
- Mantém estado visual: `active`, `is-active`, `hidden`, `aria-hidden`, `aria-selected`.
- Não liga STT, Ollama nem TTS.

## Como aplicar

1. Copie tudo para a raiz do projeto `noelle_ia`.
2. Rode `APLICAR_STREAM_V19_8_34.bat`.
3. Rode `iniciar.bat`.
4. Teste alternar várias vezes entre Chat, Avatar/Configurações e Stream.

## Próxima fase

Depois que a troca de abas estiver estável, entra a V19.8.35:

- botão `Transcrever último trecho`;
- ponte segura renderer → main;
- salvar WAV temporário;
- chamar Whisper/Python;
- devolver texto para a aba Stream.
