# Yoru Bridge Modern 1.8.43 NoelleKoboldReplace - 2026

Build preparada para substituir completamente o chat/Ollama do Noelle Companion pelo chat da Yoru usando KoboldCpp.

Caminho principal: **sem API HTTP**. O Electron inicia a Yoru como processo filho Python e troca mensagens por STDIO JSONL.

## Entrada da Yoru embutida

```bat
python -m yoru_bridge embedded
```

## Integração no GitHub do Noelle

Copie este pack para dentro do repositório como:

```txt
noelle_ia/
  yoru_chat/
    src/yoru_bridge/
    config.json
    noelle_kobold_replace/
```

Depois rode na raiz do Noelle:

```bat
node yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs
node yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
npm start
```

## Resultado

- `window.noelleAPI.chat(payload)` continua funcionando.
- O canal `noelle:chat` deixa de chamar Ollama.
- O canal `noelle:chat` passa a chamar Yoru + KoboldCpp.
- `noelle:status` mostra Kobold/Yoru e marca Ollama como desativado no chat.

## Comandos úteis

```txt
/noelle status
/kobold status
/baixar status
/baixar tudo
/modelo status
/skills status
```
