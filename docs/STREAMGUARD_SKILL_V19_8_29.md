# StreamGuard Skill — Perguntas direcionadas

## Objetivo

Evitar que a Noelle/Yoru responda toda hora enquanto o microfone estiver ativo.

## Regra principal

A Noelle/Yoru só deve responder quando a fala transcrita for claramente uma pergunta direcionada a ela.

## Bloqueios

Ela não deve responder a:

- conversa de fundo;
- frases soltas;
- comentários sem pergunta;
- ruído;
- música;
- fala de outra pessoa;
- pensamento em voz alta;
- comandos sem chamar Noelle/Yoru;
- perguntas gerais sem wake word.

## Wake words obrigatórias

- Noelle
- Yoru
- Ei Noelle
- Ei Yoru

## Exemplos

```txt
"Como faço isso?"
→ não responde

"Noelle, como faço isso?"
→ responde

"Yoru, qual é o próximo passo?"
→ responde

"isso ficou estranho"
→ não responde

"Noelle, isso ficou estranho?"
→ responde
```

## Regra de código

```js
shouldRespond(text) = temWakeWord && parecePergunta
```

## Modo padrão

Wake word + pergunta.

Nunca usar conversa contínua como padrão.
