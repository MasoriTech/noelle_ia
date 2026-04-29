# Noelle V19.8.1d — Manifest Forte 2026

Esta fase corrige somente o `avatar_manifest.json` e mantém a base segura da V19.8:

- `iniciar.bat` continua único.
- Opção `[1] Iniciar programa agora` apenas inicia com `npm start`.
- O preload limpo da V19.8.1a é preservado.
- A aba Avatar final ainda não é redesenhada nesta fase.

## O problema corrigido

O diagnóstico acusava:

```txt
avatar_manifest.json existe, mas não é uma lista/array JSON
Manifest não contém nenhum VRM/GLB válido
Nenhum arquivo do manifest existe no disco
```

O formato correto é uma lista JSON:

```json
[
  {
    "id": "yoru",
    "name": "Yoru",
    "type": "vrm",
    "rel": "assets/avatars/Yoru.vrm",
    "path": "src/assets/avatars/Yoru.vrm"
  }
]
```

## Como aplicar

1. Copie o conteúdo do pack para a raiz do projeto `noelle_ia`.
2. Rode `iniciar.bat`.
3. Escolha `[4] Reparar manifest e rodar diagnostico`.
4. Depois use `[1] Iniciar programa agora`.

## Observação

Se nenhum avatar for encontrado, coloque seus `.vrm` em uma pasta como:

```txt
src/assets/avatars/
assets/avatars/
```

Depois rode a opção `[4]` novamente.
