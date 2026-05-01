# Noelle/Yoru V19.8.28 — Status/Assets split

Segunda quebra segura do `src/renderer/controls_window_app.js`.

## Arquivo novo

```txt
src/renderer/modules/noelle_status_assets_v19_8_28.js
```

## Funções movidas

```txt
refreshStatus
loadAssets
```

## O que ficou no arquivo original por enquanto

```txt
renderAssets
makeAssetCard
renderExpressionCards
renderMotionCards
renderItemCards
sendAvatarCommand
```

Isso evita mexer no Avatar e nos cards de assets nesta fase.

## Como aplicar

```bat
node scripts\apply_v19_8_28_auto_2026.cjs
```

Ou pelo `iniciar.bat` incluído.
