# Noelle/Yoru V19.8.27c — updateAssetSummary hardfix

Corrige definitivamente o erro:

```txt
function updateAssetSummary(counts = {}) { ... }) {
SyntaxError: Unexpected token ')'
```

## Causa

O V19.8.27b encontrou o padrão quebrado, mas o resíduo `}) {` continuou no arquivo.

## Correção

- neutraliza a linha quebrada;
- remove o corpo antigo quando possível;
- valida `node --check src/renderer/controls_window_app.js`;
- mantém `updateAssetSummary` como stub para `NoelleRendererCoreV19827`.

## Como aplicar

```bat
node scripts\apply_v19_8_27c_auto_2026.cjs
```

Ou pelo `iniciar.bat`.
