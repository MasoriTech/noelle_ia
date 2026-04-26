# Como rodar a Noelle IA

## 1. Instalar dependências JavaScript

```bash
npm install
```

## 2. Instalar Ollama

Instale o Ollama no Windows e baixe o modelo principal:

```bash
ollama pull qwen3:0.6b
```

## 3. Preparar áudio local opcional

Para usar faster-whisper:

```bash
py -3 -m pip install -r tools/noelle_stt/requirements.txt
```

## 4. Iniciar

```bat
iniciar.bat
```

## Problemas comuns

### Ollama offline

Abra o Ollama antes de iniciar a Noelle, ou inicie o Ollama pelo menu do Windows.

### Modelo não instalado

Rode:

```bash
ollama pull qwen3:0.6b
```

### Áudio não transcreve

Rode:

```bat
DIAGNOSTICO_AUDIO_STT.bat
```
