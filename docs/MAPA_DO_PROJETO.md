# Mapa do Projeto - Noelle v20

## Camadas

- `main/`: janela Electron, IPC e caminhos.
- `preload/`: ponte segura entre tela e backend.
- `renderer/`: interface, páginas e componentes.
- `core/`: IA, voz, avatar e stream.
- `config/`: configurações editáveis.
- `data/`: memória, logs, cache e sessões.
- `assets/`: avatares, cenas, itens, ícones e sons.
- `scripts/`: diagnóstico, limpeza e build.

## Regra principal

Renderer não acessa arquivo, não chama Ollama direto, não chama STT/TTS direto.
Renderer chama preload. Preload chama IPC. IPC chama core.
