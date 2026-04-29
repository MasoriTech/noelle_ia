# Noelle Companion 2026 — V19.8.0 Base Segura

Esta fase cria uma base segura antes de mexer de novo no Avatar, preload ou Room.

## Regra principal

A opção `[1] Iniciar programa agora` do `iniciar.bat` apenas inicia o programa.

Ela não deve:

- aplicar patch;
- rodar build;
- reescrever arquivos;
- usar PowerShell;
- chamar `Activate.ps1`;
- chamar `Set-ExecutionPolicy`.

## Menu do iniciar.bat

```txt
[1] Iniciar programa agora
[2] Rodar diagnostico V19.8 Base
[3] Reparar projeto / aplicar V19.8 Base Segura
[4] Regerar manifest e bundles do Avatar
[5] Limpar outros .bat antigos (mover para backup seguro)
[6] Excluir outros .bat antigos permanentemente
[7] Mostrar status do projeto
[0] Sair
```

## O que este patch faz

- Entrega um único `iniciar.bat` principal.
- Separa iniciar, reparar, diagnosticar e rebuildar.
- Adiciona diagnóstico V19.8 base.
- Adiciona reparo manual V19.8 base.
- Gera `src/assets/avatar_manifest.json`.
- Atualiza `package.json` somente quando você escolhe a opção `[3]`.
- Atualiza `MEMORIA_GPT_NOELLE.md` somente quando você escolhe a opção `[3]`.

## O que este patch ainda não faz

- Ainda não limpa `preload.js`.
- Ainda não remove runtime antigo V19.3/V19.5.
- Ainda não transforma a aba Avatar em rota real.
- Ainda não muda layout do Avatar.

Essas próximas partes devem vir em fases separadas.

## Ordem recomendada

1. Copie este pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Use `[2] Rodar diagnostico` para ver o estado.
4. Use `[3] Reparar projeto / aplicar V19.8 Base Segura`.
5. Use `[5] Limpar outros .bat antigos` para mover os `.bat` antigos para backup.
6. Use `[1] Iniciar programa agora` para testar início limpo.

## Próxima fase

V19.8.1 — Preload Limpo:

- remover injeção visual antiga do `preload.js`;
- parar de carregar `avatar_v19_5_panel_bootstrap.js` automaticamente;
- parar de carregar `noelle_v19_3_complete_ui_md.js` automaticamente;
- manter somente APIs seguras (`noelleAPI`, `desktopWidget`, `noelleRoom`).
