# Noelle V19.8.1c - Manifest Normalizer

Este patch corrige a fase V19.8.1b quando o diagnóstico informa:

```txt
avatar_manifest.json existe, mas não é uma lista/array JSON
Manifest não contém nenhum VRM/GLB válido
Nenhum arquivo do manifest existe no disco
```

## O que ele faz

- Regrava `src/assets/avatar_manifest.json` como array JSON.
- Procura arquivos `.vrm` e `.glb` em pastas comuns do projeto.
- Usa varredura profunda controlada, ignorando `node_modules`, `.git`, `backups`, `release`, `dist`, `.venv` e similares.
- Preserva a V19.8.1a: `preload.js` continua limpo, sem injetar UI antiga.
- Mantém um único `iniciar.bat`.
- A opção `[1] Iniciar programa agora` continua apenas iniciando o app.

## Ordem recomendada

1. Rode `iniciar.bat`.
2. Escolha `[3] Reparar/normalizar avatar_manifest.json V19.8.1c`.
3. Escolha `[2] Rodar diagnostico V19.8.1c`.
4. Se passar, escolha `[1] Iniciar programa agora`.

## Próxima fase

Depois que o manifest passar, a próxima etapa correta é:

```txt
V19.8.2 - Aba Avatar real no renderer principal
```
