Noelle Companion 2026 - Bundle Clean

Esta versão limpa as rebarbas antigas.

Não usa mais:
- importmap
- vendor local
- runtime_shims
- avatar_bootstrap.js
- controls_bootstrap.js
- import dinâmico para carregar o avatar

Usa agora:
- esbuild
- bundles em src/renderer_dist
- imports diretos do node_modules durante o build

Como testar:
1) dependencies.bat
2) iniciar.bat

Se der problema:
1) reparar_avatar.bat
2) npm.cmd run module-report
3) npm.cmd run smoke-test

Arquivos esperados após o build:
- src\renderer_dist\launcher.bundle.js
- src\renderer_dist\controls.bundle.js
- src\renderer_dist\avatar.bundle.js


Atualização 2.2.1:
- controles mais compactos
- botão Voltar ao menu
- dashboard superior removido
- escala automática para itens 3D como bola e violão


Fase 1 do design Noelle
- launcher com tema Noelle
- seção Selecionar avatar no menu inicial
- botão Importar VRM no menu inicial
- controles com visual mais próximo do mockup
- moldura do avatar com tema escuro/roxo/vermelho
- base visual preparada para as próximas fases


Fase 2 do design Noelle
- janela de controles reconstruída para ficar mais parecida com o mockup
- aba Principal agora reúne câmera, tamanho, ações, emotes, inventário e sliders
- tema visual alinhado às cores da Noelle VRM: preto, roxo, lilás e vermelho
- janela do avatar com moldura/status estilo mockup
- emotes usam thumbnail da Noelle como base visual


Fase 3
- miniaturas dos emotes usando imagens reais da pasta expressions
- tamanho padrão das janelas ajustado para ficar mais próximo do mockup
- estado antigo de tamanho/posição é ignorado por versão de layout nova
- status inferior do avatar fica persistente como "Noelle ativa"


Fase 3.1
- menu inicial sem botão Sair visível
- janela inicial compactada
- orientação de saída movida para X da janela/bandeja


Fase 4
- avatar centralizado ao iniciar
- janela do avatar maior: 420x730 por padrão
- reset automático do tuning antigo
- botões de tema: Noelle, Escuro, Branco e Sistema
- tema aplicado também na janela do avatar


Fase 5 - Checkup e correções
- Desequipar corrigido.
- Abas Emotes e Inventário deixam de ser vazias.
- Modo duas mãos para violão preto e bola de basquete.
- Conflitos de slot corrigidos.
- npm run checkup adicionado.


Fase 6 - Seletor de avatares
- Menu inicial agora tem seleção tipo party.
- Adicionar avatar aceita VRM, GLB e GLTF.
- VRM é recomendado.
- GLB/GLTF entra como modelo estático experimental.
- Selecionar avatar substitui a Noelle na janela do avatar.


Fase 7 - Layout responsivo moderno
- Adicionado src/styles/responsive.css.
- Botões, cards, inventário, emotes e seletor de avatares agora usam clamp(), auto-fit e minmax().
- Adicionado modo compacto automático para janelas menores.
- Adicionadas container queries para componentes responderem ao tamanho do painel.


Fase 8.1 - Exportar avatar corrigido
- Botão Exportar avatar adicionado no launcher.
- VRM/GLB exporta como arquivo.
- Live2D exporta como pasta inteira.
- Importar Live2D agora copia a pasta inteira do model3 para evitar bug de caminho.


Fase 8.2 - Troca de avatar 2
- Removida Noelle Silva do seletor.
- Adicionada Arisa como avatar 2 VRM.
- Arisa fica em src/assets/avatars/arisa.vrm.
- Haru continua como avatar 3 Live2D preview.


Versão super leve
- Removido Haru Live2D.
- Removido MMD/VMD.
- Mantidos Noelle e Arisa.
- Mantida correção dos sliders e layout responsivo.


Fase 10 - Arisa limpa e tema Noelle clássico
- Trocar avatar limpa itens equipados antigos.
- Arisa não deve mais abrir com violão herdado.
- Arisa ajustada para aparecer de frente.
- Adicionado tema Noelle Preto/Vermelho/Branco.
- Aba Sobre expandida com informações do projeto.
- Adicionados botões para remover itens do avatar.


Fase 10.1 - Tema padrão e Arisa de frente
- Tema Noelle Preto/Vermelho/Branco definido como padrão do app.
- Arisa corrigida para aparecer de frente.
- Nome do avatar aparece no pill superior.


Fase 10.2 - Estado por avatar
- Estado separado por avatar.
- Botões de girar avatar e salvar posição.
- Noelle e Arisa não compartilham mais itens/rotação.


NOELLECORE IA INTEGRADA
-----------------------
Esta versão inclui a aba Chat IA e o NoelleCore interno usando Ollama.
Comece baixando apenas qwen3:0.6b em BAIXAR_MODELOS_IA.bat.
Depois execute iniciar.bat e teste a aba Chat IA.
Leia NOELLECORE_IA_INTEGRADA_2026.txt para detalhes.
