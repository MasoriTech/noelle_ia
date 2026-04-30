# Noelle/Yoru V19.8.20a — Correção do falso positivo MutationObserver

O diagnóstico V19.8.20 podia acusar erro porque procurava a palavra `MutationObserver` no arquivo inteiro.

O runtime não usava observador de DOM ativo; a palavra aparecia em comentário.

Este patch:
- remove a palavra do comentário do runtime;
- atualiza o diagnóstico para procurar somente uso real da API;
- não altera layout, câmera, VRM ou importação.
