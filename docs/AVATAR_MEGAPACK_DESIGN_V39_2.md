# Avatar Megapack Design V39.2 Robust

## Owner único

```txt
src/renderer/pages/avatar/avatar_design_owner_v39_2.js
```

## Renderer preservado

```txt
src/avatar_loadfile_preview_v19_8_3.html
```

## Onde ajustar design

No owner v39.2:

```js
const DESIGN = Object.freeze({
  rootHeight: "calc(100vh - 138px)",
  minHeight: "600px",
  previewMinWidth: "620px",
  sideWidth: "390px",
  gap: "16px",
  headerHeight: "64px",
  previewToolbarHeight: "46px"
});
```

## O que foi reforçado

- O owner é idempotente.
- O observer tem debounce.
- Os botões só recebem listener uma vez.
- Scripts antigos ativos são removidos.
- Nós antigos são removidos.
- Existe fallback visual quando o iframe demora.
- Existe rollback do HTML.