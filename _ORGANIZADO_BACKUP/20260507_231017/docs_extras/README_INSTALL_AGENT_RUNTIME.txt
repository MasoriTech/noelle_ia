INSTALAÇÃO

1) Copiar arquivos para raiz do projeto

2) Abrir src/main.js

Adicionar:

require("./src/runtime/agent_identity_loader_v1.js").buildSystemPrompt();

ANTES do carregamento do LLM

Isso ativa o soul.md existente automaticamente

Compatível com:

agents/<agent>/soul.md
ou
raiz/soul.md