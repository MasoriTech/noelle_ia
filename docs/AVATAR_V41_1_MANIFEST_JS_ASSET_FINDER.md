# Avatar V41.1 — Manifest JS + Asset Finder

## O que o print mostrou

A Noelle carregou rápido, então o Loadfile foi restaurado corretamente.

O problema restante foi a lista:
- só Noelle apareceu;
- nenhum cenário apareceu.

Isso indica que o manifest não carregou ou os assets não foram encontrados.

## Correção

O v41.1 gera dois manifest:

```txt
src/assets/model_manifest_v41_1.json
src/renderer/pages/avatar/model_manifest_v41_1.js
```

O segundo é injetado no `controls.html`:

```html
<script src="./renderer/pages/avatar/model_manifest_v41_1.js"></script>
<script src="./renderer/pages/avatar/avatar_page_owner_v41_1.js"></script>
```

Assim a UI não depende apenas de `fetch()` local para JSON.

## Pastas corretas

```txt
src/assets/avatars/Yoru.vrm
src/assets/avatars/nezuko_kamado.glb
src/assets/scenes/naruto_sala_examen_chunnin.glb
```

## Se aparecer AUSENTE

Significa que o arquivo não existe nesse caminho. Copie o arquivo para o caminho mostrado e rode `iniciar.bat`.