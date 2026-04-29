# Noelle V19.8.1b — Manifest Robusto 2026

Este patch corrige a falha em que `src/assets/avatar_manifest.json` existe, mas está vazio ou não é uma lista JSON.

## O que ele faz

- Gera `src/assets/avatar_manifest.json` como array JSON.
- Procura arquivos `.vrm` e `.glb` em pastas seguras do projeto.
- Mantém o `preload.js` limpo da V19.8.1a.
- Preserva Chat IA, Room, Widget Mode, Preview/Teste, VRMA, expressions PNG e items GLB.
- Mantém um único `iniciar.bat`.
- A opção `[1] Iniciar programa agora` não aplica patch, não roda build e não ativa PowerShell.

## Como usar

1. Copie o conteúdo do pack para a raiz do projeto `noelle_ia`.
2. Rode `iniciar.bat`.
3. Escolha `[3] Reparar manifest / aplicar V19.8.1b`.
4. Escolha `[2] Rodar diagnostico V19.8.1b`.
5. Escolha `[1] Iniciar programa agora`.

## Próxima fase

Depois que este diagnóstico passar, a próxima fase correta é a V19.8.2: Aba Avatar real no renderer principal.
