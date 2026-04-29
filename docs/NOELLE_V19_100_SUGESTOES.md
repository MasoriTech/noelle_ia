# Noelle V19 — Roadmap 100 melhorias

Este arquivo consolida as 100 sugestões discutidas para a Room/Yoru, sem lotar a UI principal.

1. Confirmar que a Yoru aparece como player real no Third Person, não apenas fallback.
2. Diagnóstico visual dentro da Room mostrando VRM carregado, fallback, erro de asset e caminho usado.
3. Melhorar carregamento do Yoru.vrm com log claro de sucesso/falha.
4. Painel de debug da Room com FPS, modo atual, posição do player, câmera e asset carregado.
5. Botão Parar foco sempre soltar gizmo e seleção do item.
6. Evitar conflito ao trocar rápido entre Build Mode, Yoru POV e Third Person.
7. Câmera Third Person com colisão para não atravessar parede/mesa/piano/objetos grandes.
8. Ajustar altura dos olhos no Yoru POV por VRM, com fallback configurável.
9. Botão Recentrar player separado de reset total.
10. Salvar posição do player corretamente no layout da Room.
11. Salvar modo atual opcionalmente: Build, Yoru POV ou Third Person.
12. Melhorar colisão do player com móveis grandes.
13. Impedir player nascer dentro de objeto depois de carregar layout.
14. Adicionar chão sólido real para pulo não atravessar ou flutuar.
15. Melhorar pulo com suavidade, queda natural e limite de spam.
16. Sistema de paredes da Room em vez de só chão aberto.
17. Presets reais de quarto: gamer, escritório, musical e simples.
18. Separar itens de cenário de itens de mão de forma rígida.
19. Categorias melhores para items: chão, mesa, parede, mão, decoração, eletrônico, instrumento.
20. Preview do item antes de colocar na Room.
21. Snap no chão, mesa e parede dependendo do tipo do item.
22. Pontos de encaixe para mesa: copo, notebook, dado, papel, celular.
23. Pontos de encaixe para mão/avatar separados da Room.
24. Impedir item pequeno cair no chão quando deveria ir para mesa.
25. Botão Mandar para frente da Yoru.
26. Botão Colocar na mesa mais próxima.
27. Botão Alinhar com chão melhorado.
28. Botão Duplicar em grade.
29. Autosave com várias versões recuperáveis.
30. Botão Restaurar layout padrão.
31. Animação idle no Third Person.
32. Animação walk quando anda.
33. Animação jump quando pula.
34. Animação run quando segura Shift.
35. Sincronizar emotes da Yoru com player da Room.
36. Sincronizar expressions PNG/VRM com player da Room.
37. Permitir escolher avatar player: Yoru, Noelle ou outro VRM.
38. Calibração de altura do avatar.
39. Opção Mostrar corpo no Yoru POV para debug.
40. Braços/mãos visíveis no First Person estilo VRChat.
41. Unificar scripts V18.7, V18.8 e V18.9 para não acumular hotfix.
42. Criar room_core.js separando player, câmera, layout e UI.
43. Testes automáticos básicos para Room abrir, bundle gerar e assets existirem.
44. Diagnóstico para imports de Three.js e @pixiv/three-vrm.
45. Evitar duplicar handlers de botão quando aplica patch várias vezes.
46. Garantir só um INICIAR.bat na raiz.
47. Logs claros no terminal por etapa.
48. MEMORIA_GPT_NOELLE.md atualizada após cada versão.
49. Checklist de release: node check, bundle, assets, bat, package, memória.
50. V19 consolidada limpa, sem restos de hotfix antigo.
51. Tela Room Status dentro da Room.
52. Indicador visual do modo atual no canto da tela.
53. Mini tutorial dentro da Room com controles básicos.
54. Botão Reset câmera separado do Parar foco.
55. Reset player mais seguro, voltando para spawn livre.
56. Spawn point editável para escolher onde a Yoru nasce.
57. Item invisível Player Spawn no Build Mode.
58. Proteção contra spawn dentro de parede/móvel.
59. Sistema de paredes com colisão real.
60. Teto opcional para Room fechada.
61. Modo quarto aberto e quarto fechado.
62. Luz ambiente configurável: claro, escuro, noite, neon, gamer.
63. Slider de intensidade da luz.
64. Botão Centralizar Room.
65. Grid configurável: 0.1, 0.25, 0.5, 1.0.
66. Snap toggle por eixo: X, Y, Z.
67. Rotação com snap configurável: 5°, 15°, 30°, 45°, 90°.
68. Botão Desfazer seleção além do Parar foco.
69. Outline melhor no item selecionado.
70. Highlight ao passar mouse sobre item.
71. Painel de propriedades por item com nome, categoria, posição, rotação, escala e colisão.
72. Permitir renomear itens colocados na Room.
73. Permitir travar/destravar item individualmente.
74. Permitir esconder/mostrar item sem apagar.
75. Camadas: cenário, móveis, decoração, interativos.
76. Filtro somente itens visíveis no layout list.
77. Busca no layout list.
78. Selecionar item na lista e olhar para ele somente em Build.
79. Modo câmera livre sem selecionar objeto.
80. Modo espectador/freecam separado da Yoru POV.
81. Controle de velocidade da câmera livre.
82. Controle de velocidade da Yoru.
83. Controle de altura da câmera do Yoru POV.
84. Controle de distância da câmera Third Person.
85. Controle de suavidade da câmera Third Person.
86. Colisão da câmera com paredes e objetos grandes mais precisa.
87. Botão Teleportar Yoru para cá clicando no chão.
88. Botão Trazer Yoru para frente da câmera.
89. Botão Olhar para item selecionado sem travar foco permanentemente.
90. Interação básica com objetos: sentar, tocar piano, pegar item, beber água.
91. Tags de interação no manifesto: sit, drink, play_music, hold, inspect.
92. Hotspots nos móveis: cadeira tem ponto de sentar, mesa tem ponto de colocar item.
93. Lógica item de mão + emoção, por exemplo ação de beber usa item correto.
94. Presets de ação: beber água, usar celular, sentar, tocar piano.
95. Estados da Yoru por modo: idle, walk, run, jump, sit, interact.
96. Transição suave entre animações.
97. Fallback de animação se VRMA não existir.
98. animation_manifest.json separado ligando animações a ações.
99. interaction_manifest.json ligando itens a ações possíveis.
100. V19 como versão consolidada, removendo restos de hotfix e deixando Room/Yoru como sistema principal estável.
