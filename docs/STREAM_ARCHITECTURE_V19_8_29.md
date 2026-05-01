# Stream IA — Arquitetura planejada

## Regra inicial

O microfone nunca deve ligar automaticamente.

Na fase inicial, a aba Stream é apenas visual. O botão **Iniciar escuta** muda o estado da interface, mas não captura áudio.

## Fases

### V19.8.29 — Aba Stream visual

- cria aba Stream;
- cria estados;
- cria botões;
- cria teste visual da StreamGuard;
- não liga microfone.

### V19.8.30 — Microfone por botão

- botão Iniciar escuta pede permissão;
- mostra volume real;
- botão Parar escuta desliga tudo.

### V19.8.31 — VAD simples

- detecta fala;
- detecta silêncio;
- fecha trecho depois de 800ms a 1200ms.

### V19.8.32 — STT por trecho

- salva trecho;
- transcreve com STT local;
- mostra texto na aba.

### V19.8.33 — Ollama streaming

- envia pergunta aprovada para Ollama;
- mostra resposta em streaming.

### V19.8.34 — TTS por frases

- quebra resposta por frases;
- gera voz em fila.

### V19.8.35 — Barge-in

- se o usuário chamar Noelle/Yoru enquanto ela fala, cancela a fala atual.

## Modo padrão

- Botão manual;
- Wake word obrigatória;
- conversa contínua nunca deve ser padrão.
