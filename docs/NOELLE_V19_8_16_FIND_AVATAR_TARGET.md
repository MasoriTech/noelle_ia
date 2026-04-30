# Noelle/Yoru V19.8.16 — Diagnóstico seguro do Avatar

Este pack não altera nada.

Ele procura o arquivo real que desenha o preview da aba Avatar, usando a frase:

`Arraste para girar, use scroll para zoom`

Também procura:
- `WebGLRenderer`
- `setClearColor`
- `0xffffff`
- `#ffffff`
- `white`
- `scene.background`

## Como usar

Na raiz do projeto, rode:

```bat
node scripts\diagnostico_v19_8_16_find_avatar_target_2026.cjs
```

Depois envie o resultado do arquivo `#1`.
