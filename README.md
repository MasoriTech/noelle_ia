# Noelle + Yoru Chat Clean Pack 1.8.44

Este pacote é para organizar a integração do **Noelle Companion** com o chat/cérebro da **Yoru** usando **KoboldCpp** no lugar do Ollama.

## Objetivo

- Noelle continua sendo app, janela, avatar, renderer, STT/TTS visual.
- Yoru vira o chat/cérebro embutido.
- KoboldCpp vira o backend dos modelos FAST/THINK.
- Ollama deixa de ser usado no canal principal de chat.

## Estrutura limpa

Copie somente a pasta `yoru_chat/` para a raiz do GitHub `noelle_ia/`:

```txt
noelle_ia/
  main.js
  preload.js
  package.json
  src/
  yoru_chat/
    src/yoru_bridge/
    config.json
    requirements/
    noelle_kobold_replace/
```

## Aplicar no Noelle

Na raiz do repositório `noelle_ia`, rode:

```bat
node yoru_chat
oelle_kobold_replacepply_noelle_kobold_replace_2026.cjs
node yoru_chat
oelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
npm start
```

## O que foi removido desta organização

- histórico antigo de changelog por versão;
- READMEs redundantes;
- API HTTP legado como caminho principal;
- `__pycache__` e `.pyc`;
- arquivos runtime gerados como `runtime_state.json`;
- requirements duplicados.

## Entrada principal da Yoru

```bat
python -m yoru_bridge embedded
```

Esse modo usa STDIO JSONL para o Electron chamar a Yoru como processo filho.
