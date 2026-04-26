# Organização do código da Noelle IA

Este patch adiciona o `ORGANIZAR_CODIGO_NOELLE.bat`.

Ele foi feito para limpar a raiz do projeto antes de commits no GitHub, sem mexer no funcionamento principal da Noelle.

## O que ele mantém na raiz

- `main.js`
- `preload.js`
- `package.json`
- `package-lock.json`
- `iniciar.bat`
- `PREPARAR_AUDIO_STT.bat`
- `DIAGNOSTICO_AUDIO_STT.bat`
- `BAIXAR_MODELOS_IA.bat`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `VERSION`

## O que ele move

Documentos antigos e relatórios soltos vão para `docs/legacy`.
Scripts auxiliares antigos vão para `scripts/windows`.

## O que ele remove

- `node_modules/`
- `logs/`
- `release/`
- `dist/`
- `build/`
- `.venv/`
- cache/modelos locais do STT

Essas coisas não devem ir para o GitHub.

## Fluxo recomendado

1. Teste a Noelle.
2. Rode `ORGANIZAR_CODIGO_NOELLE.bat`.
3. Abra o GitHub Desktop.
4. Confira os arquivos em `Changes`.
5. Se não tiver coisa pesada, faça commit.
6. Faça `Push origin`.
