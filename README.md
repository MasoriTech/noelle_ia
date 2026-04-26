# Noelle IA

Noelle IA é um companion desktop em Electron com chat local integrado ao Ollama e preparação para áudio local com faster-whisper.

O projeto foi pensado para rodar localmente no Windows, com foco em interface limpa, persona própria da Noelle e uso controlado de recursos em PCs mais fracos.

## Recursos

- Interface desktop com Electron.
- Chat local com NoelleCore.
- Integração com Ollama.
- Modelo padrão recomendado: `qwen3:0.6b`.
- `think: false` para respostas mais diretas no Qwen3.
- Perfis de desempenho para PC fraco.
- Persona da Noelle em português brasileiro.
- Preparação para STT local com faster-whisper.
- Worker de STT para reaproveitar o modelo carregado.
- Scripts de diagnóstico para áudio e inicialização.

## Requisitos

- Windows 10 ou 11.
- Node.js e npm.
- Python 3.
- Ollama instalado.
- Git, opcional para desenvolvimento.

## Instalação

Instale as dependências do Electron:

```bash
npm install
```

Prepare o áudio local, se for usar microfone com faster-whisper:

```bash
py -3 -m pip install -r tools/noelle_stt/requirements.txt
```

Instale o modelo local do Ollama:

```bash
ollama pull qwen3:0.6b
```

## Rodando

No Windows, use:

```bat
iniciar.bat
```

Ou, durante desenvolvimento:

```bash
npm start
```

## Modelos

Os modelos não são incluídos no repositório.

### Ollama

Modelo principal recomendado:

```bash
ollama pull qwen3:0.6b
```

Outros modelos podem ser configurados no app, mas não devem ser enviados para o GitHub.

### faster-whisper

O modelo de STT é baixado/cacheado no primeiro uso pelo faster-whisper. O padrão atual do projeto é `medium`, mas pode ser ajustado depois para `small`, `base` ou `tiny` se o PC estiver sofrendo.

## Estrutura

```txt
src/                  Interface e renderer
scripts/              Scripts de build/checkup
tools/noelle_stt/     Scripts Python para STT local
main.js               Processo principal Electron
preload.js            Ponte segura entre UI e processo principal
iniciar.bat           Inicializador Windows
```

## O que não vai no GitHub

- `node_modules/`
- `release/`, `dist/`, `build/`
- `logs/`
- modelos do Ollama
- modelos/cache do faster-whisper
- `.venv/`
- arquivos `.zip`, `.rar`, `.7z`
- áudios temporários

## Licença

Este projeto está sob a licença MIT. Veja `LICENSE`.
