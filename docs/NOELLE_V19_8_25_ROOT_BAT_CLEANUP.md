# Noelle/Yoru V19.8.25 — Root BAT cleanup

Este pack limpa a raiz do projeto movendo `.bat` legados para `legacy_bats/`.

## Mantém na raiz

```txt
iniciar.bat
```

## Move para legacy_bats/

```txt
APLICAR_*.bat
RODAR_DIAGNOSTICO_*.bat
FIX_*.bat
REPAIR_*.bat
CORRIGIR_*.bat
DIAGNOSTICO_*.bat
```

## O que não mexe

- UI
- Avatar
- Chat
- Room
- renderer
- preload
- assets
- backups
- scripts `.cjs`

## Como aplicar

Na raiz do projeto:

```bat
node scripts\repair_v19_8_25_root_bat_cleanup_2026.cjs
node scripts\diagnostico_v19_8_25_root_bat_cleanup_2026.cjs
git status
```

Depois:

```bat
git add .
git commit -m "Organiza bats legados fora da raiz"
git push origin main
```
