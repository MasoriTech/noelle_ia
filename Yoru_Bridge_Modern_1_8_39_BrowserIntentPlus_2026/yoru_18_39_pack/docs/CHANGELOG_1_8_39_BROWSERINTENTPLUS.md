# Yoru Bridge Modern 1.8.39 - BrowserIntentPlus

Correções focadas no bug reportado pelo usuário:

- BrowserIntent agora tolera typos/STT comuns: `youbue`, `pquise`, `pequise`, `pesquie`, `pesqusia`.
- Parser separa melhor site e termo pesquisado em frases como `abra o youtube e pquise roberto carlos`.
- Se o site digitado for uma variação próxima de YouTube/Google, normaliza para o site correto.
- Pygame não imprime mais o banner `Hello from the pygame community` no chat.
- `config.py` foi limpo e regenerado sem funções duplicadas.

Exemplos esperados:

```txt
abra o youbue e pesquie para mim roberto carlos
abra o youtube e pquise roberto carlos
abra o google e pequise ronaldo
pesquisa no youtube gojo vs sukuna amv
```
