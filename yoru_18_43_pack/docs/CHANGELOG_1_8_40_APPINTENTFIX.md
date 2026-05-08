# Yoru Bridge 1.8.40 - AppIntentFix - 2026

Correções:

- Separação mais correta entre abrir site e abrir app local.
- `abra youtube` continua navegador.
- `abra google e pesquise ronaldo` continua navegador.
- `abra hydra`, `abra discord`, `abra steam` viram App Inventory quando não forem site conhecido.
- BrowserSkill não trata mais qualquer palavra desconhecida como site.
- App Inventory aceita fallback seguro de abertura natural quando o roteador já descartou navegador.

Observação: se o Hydra abrir e depois mostrar ECONNREFUSED 127.0.0.1:8087, isso é erro interno do Hydra/RPC local dele, não da Yoru.
