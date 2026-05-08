# Yoru Bridge Modern 1.8.39 - BrowserIntentPlus

Correção focada em roteamento de navegador.

## Corrigido

- Frases naturais de voz/texto como `abri o youtube para mim e pesqusia gojo vs sukuna amv` agora abrem busca no YouTube.
- Typos comuns de STT: `abri`, `pesqusia`, `pra mim`, `para mim`.
- Comandos de abrir/pesquisar são interceptados antes do FAST/THINK, evitando resposta inventada do modelo.
- Modo pesquisa também usa o mesmo detector de intenção do navegador.

## Exemplos

```txt
abri o youtube para mim e pesqusia gojo vs sukuna amv
abre youtube e pesquisa gojo vs sukuna amv
pesquisa gojo vs sukuna amv no youtube
pesquisa no youtube gojo vs sukuna amv
abre o google e pesquisa yoru bridge
```
