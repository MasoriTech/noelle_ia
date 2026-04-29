# Noelle IA — V19.6.1 Robust Fix 2026

Este pack foi feito seguindo a regra do `MEMORIA_GPT_NOELLE.md`: corrigir sem substituir o projeto inteiro e sem quebrar Chat IA, avatar/widget, emotes VRMA, expressions PNG, inventário GLB, Room e bandeja.

## Correção principal

O erro atual vem de `src/renderer/avatar_lab_v19_6_app.js` usando `await` no topo do arquivo, enquanto o build `scripts/build_avatar_lab_v19_6_2026.cjs` usa esbuild com `format: "iife"`.

Correção aplicada:

- remove o `top-level await` antigo;
- cria `bootAvatarLabV196()`;
- chama `void bootAvatarLabV196();`;
- mantém `format: "iife"` no build;
- adiciona verificação clara no build para avisar se o erro voltar.

## Reforços adicionados

- Backup automático em `backups/v19_6_1_robust_fix_2026_*`.
- Diagnóstico novo: `scripts/diagnostico_noelle_robusto_v19_6_2026.cjs`.
- Scripts npm novos:
  - `npm run fix:v19.6-robusto`
  - `npm run diagnostico:robusto`
  - `npm run check:robusto`
- Guardas no Avatar Lab para reduzir crash por elemento HTML ausente.
- Proteção contra loop de animação duplicado.
- `.gitignore` reforçado sem ignorar assets críticos.
- Nota V19.6.1 adicionada ao `MEMORIA_GPT_NOELLE.md`.

## Como aplicar

Copie o conteúdo deste pack para a raiz do projeto e rode:

```bat
APLICAR_CORRECOES_ROBUSTAS_NOELLE_V19_6.bat
```

Ou manualmente:

```bat
node scripts\noelle_v19_6_robust_fix_2026.cjs --apply
npm run build:avatar-lab-v19.6
npm run diagnostico:robusto
```

## Como reverter

O script cria backup antes de alterar arquivos. Procure a pasta:

```txt
backups/v19_6_1_robust_fix_2026_*
```

Copie os arquivos de volta para a raiz do projeto se precisar desfazer.
