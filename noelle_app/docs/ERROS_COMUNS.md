# Erros Comuns

## Ollama offline

Sintoma:

```txt
Ollama offline ou inacessível
```

Teste:

```bat
ollama list
ollama serve
```

## Modelo não encontrado

Sintoma:

```txt
model not found
```

Baixe o modelo configurado:

```bat
ollama pull qwen3:0.6b
```

Ou troque `config/models_config.json`.

## Electron não abre

Rode:

```bat
npm install
npm run preflight:v20
npm run start:v20
```
