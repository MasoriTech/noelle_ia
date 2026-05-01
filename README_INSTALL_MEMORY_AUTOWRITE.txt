
INSTALAÇÃO

1) Copiar arquivos para raiz do projeto

2) Abrir:

src/main.js

Adicionar após resposta do LLM:

require("./src/runtime/agent_memory_autowrite_runtime_v26.js")
.memoryAutoWrite(response_text);

Onde:

response_text = texto retornado pelo modelo

Isso ativa:

memory_short.md auto update
reflection.md auto update
state.md auto update
