from __future__ import annotations
import sys, time
from typing import List, Tuple
from .config import load_config, save_config, PACK_ROOT, CONFIG_PATH
from .core.router import route_message
from .core.prompts import build_prompt
from .core.local_responses import local_response
from .core.capabilities import build_capabilities_text, is_skills_question, handle_skills_command
from .core.events import EventBus
from .core.runtime_state import RuntimeState
from .core.healthcheck import run_pack_healthcheck
from .core.downloader import DownloadManager
from .core.answer_scope import build_scope_instruction, handle_scope_command, classify_answer_scope, max_tokens_for_scope
from .core.contracts import handle_contracts_command
from .integrations.avatar_bridge import AvatarBridge
from .core.cache import ResponseCache
from .core.perf import PerfStats
from .models.router import ModelRouter
from .storage.vault import VaultStore
from .skills.browser import BrowserSkill
from .skills.web_knowledge import WebKnowledge
from .skills.apps import AppInventorySkill
from .skills.desktop_context import DesktopContextSkill
from .skills.missing_skills import MissingSkills
from .voice.tts import TTSManager
from .voice.stt import STTEngine
from .voice.stream import StreamController
from .utils.text import normalize

HELP = """
Comandos principais:
  /ajuda                 mostra ajuda
  /skills                mostra habilidades reais da Yoru
  /skills status         painel ON/OFF das skills
  /skills comandos       comandos por categoria
  /skills buscar termo   procura comandos de uma skill
  /skills exemplos       exemplos de uso
  /mega check            auditoria local do pack, configs, deps e versões
  /baixar status         verifica modelos, KoboldCpp e dependências
  /baixar tudo           baixa/instala tudo que falta de uma vez
  /baixar modelos        baixa FAST + THINK se ainda não existirem
  /baixar deps           instala dependências Python do Mega Pack
  /baixar kobold         baixa KoboldCpp se ainda não existir
  /diagnostico pack      igual /mega check
  /scope status           mostra contrato de resposta/escopo
  /scope on/off           liga/desliga filtro de resposta ao pedido
  /scope exemplos         exemplos: top 10 sem resumo, data direta, sim/não direto
  /contratos status       mostra ContractsCore
  /contratos testar texto mostra qual contrato será aplicado
  /contratos modo rigido  reduz extras não pedidos
  /habilidades           igual /skills
  /sair                  sair
  /check                 checa FAST/THINK
  /config                mostra config ativo
  /exportar              exporta sessão para o Obsidian
  /perf                  mostra modo de velocidade e latência
  /autospeed on/off      ajuste automático quando resposta fica lenta
  /fastvoice off/on      liga/desliga fala do modelo FAST
  /turbo                 ativa modo turbo: menos memória/histórico
  /normal                ativa modo normal: mais contexto
  /cache                 mostra cache de respostas
  /cache clear           limpa cache de respostas
  /streamout on/off      liga/desliga saída incremental do modelo
  /warmup                faz ping curto no FAST/THINK
  /modelos               mostra FAST/THINK ativos
  /fastbrain              mostra/ajusta preset FAST otimizado
  /cerebro                mostra modo atual dos cérebros
  /cerebro auto|ambos     usa os dois por roteamento automático
  /cerebro fast|0.8b      força tudo no Qwen3.5 0.8B
  /fastbrain turbo|plus|gemma aplica preset FAST
  /cerebro think|2b       força tudo no Qwen3.5 2B
  /cerebro dual           FAST rascunha + THINK revisa (mais lento)
  /dual texto             usa os dois cérebros só nesta pergunta

Programas do PC:
  /apps scan              cria/atualiza inventário local de programas
  /apps list              mostra programas abríveis encontrados
  /apps buscar nome       busca programa no inventário
  /apps abrir nome        abre programa por atalho seguro
  /apps favoritos         lista favoritos
  /apps favorito add nome fixa app como favorito
  /apps recentes          últimos apps abertos pela Yoru
  abre o programa Discord abre app por linguagem natural

Desktop / contexto do PC:
  /desktop               status das skills de desktop
  /tela capturar         salva print da tela em data/screenshots
  /tela analisar         captura print e prepara análise futura
  /pc status             mostra sistema, RAM/disco e portas dos modelos
  /pc diagnostico        diagnóstico maior: Python, deps e processos
  /pc portas             checa portas FAST/THINK
  /modelo status         checa portas e caminhos FAST/THINK
  /arquivos recentes     lista arquivos recentes em Downloads/Docs/Desktop
  /arquivos buscar nome  busca arquivos locais por nome
  /arquivos abrir ultimo zip abre ZIP mais recente
  /arquivos organizar downloads mostra prévia segura sem mover nada
  /clip ler              lê texto copiado
  /clip resumir          resume texto copiado usando THINK
  /clip melhorar         melhora texto copiado usando THINK
  /clip salvar nota      salva clipboard no vault
  /tarefa adicionar texto adiciona tarefa local
  /tarefa hoje           lista tarefas pendentes
  /tarefa concluir 1     marca tarefa como concluída
  /memoria lembrar texto salva memória manual
  /memoria buscar termo  busca no vault local
  /diario texto          salva registro rápido do dia
  /projeto status        status do projeto Yoru/Noelle
  /projeto bugs          pendências conhecidas
  /rotina modo yoru      abre pasta do pack e mostra checklist

Pesquisa / navegador:
  /pesquisa on            ativa modo pesquisa persistente
  /pesquisa off           desativa modo pesquisa
  /pesquisa status        mostra status do modo pesquisa
  /pesquisa texto          pesquisa na internet e responde com fontes rápidas
  /web texto               igual /pesquisa texto
  /web on | /web off       liga/desliga fallback web automático
  /web cache clear         limpa cache de pesquisa
  pesquisa gatos no youtube       abre busca no YouTube
  abri o youtube e pesquisa X     abre a busca do YouTube, mesmo com fala natural
  veja no google melhores animes 2026  pesquisa e responde com fontes

Chat:
  texto normal           Chat Texto
  /fast texto            força modelo FAST
  /think texto           força modelo THINK
  /projeto texto         perfil projeto
  /tecnico texto         perfil técnico
  /saber texto           perfil conhecimento

Voz:
  /voz status | /tts status
                         status da voz
  /voz on | /voz off     liga/desliga TTS
  /voz edge | /voz windows
  /tts player pygame     usa pygame como player interno
  /tts player externo    volta para player externo do Windows
  /voz persistente       liga modo persistente: local + FAST + THINK falam
  /voz tudo              igual /voz persistente
  /voz modelo on/off     liga/desliga TTS de respostas de modelo
  /voz fast on/off       liga/desliga TTS do FAST
  /voz think on/off      liga/desliga TTS do THINK
  /voz fila              mostra fila e diagnóstico curto
  /voz diagnostico       diagnóstico completo do TTS
  /voz reset             limpa falhas e religa voz
  /voz semmarkdown       remove **, *, _, links e markdown antes de falar
  /testarvoz | /tts teste
                         fala frase de teste
  /falar texto | /tts dizer texto
                         fala um texto
  /pararvoz | /tts parar limpa fila/para playback
  /limparvoz             limpa cache de áudio
  /ouvir                 grava alguns segundos e envia para a Yoru
  /stt diagnostico       checa STT

Stream:
  /stream on             inicia Chat Stream ao vivo com VAD + Faster-Whisper/CT2
  /stream status         mostra config stream
  /stream diagnostico    diagnóstico do microfone/STT/stream
  /stream calibrar       liga calibração automática de ruído
  /stream continuo on/off responde sem precisar chamar Yoru
  /stream wake on/off    exige ou não palavra Yoru
  /stream sensibilidade 1-5 ajusta VAD: 1 menos sensível, 5 mais sensível
  /ctrlvoz               segure CTRL para gravar e solte para transcrever


Faltantes 1.8.29:
  /tela ocr              captura tela e tenta ler texto com OCR opcional
  /tela ler erro         igual /tela ocr, para erro aberto na tela
  /janela list           lista janelas abertas
  /janela focar nome     tenta trazer janela para frente no Windows
  /janela minimizar tudo minimiza todas as janelas no Windows
  /janela fechar nome --confirmar tenta fechar janela normalmente
  /arquivos abrir nome   abre arquivo local encontrado pelo nome
  /arquivos organizar downloads --confirmar move não-executáveis para _YoruOrganizado
  /arquivos limpar cache yoru --confirmar remove prints/áudios antigos
  /clip copiar texto     escreve texto no clipboard
  /modelo api            testa /v1/models do FAST/THINK
  /pc gpu                tenta listar GPU/vídeo

Avatar Bridge / SkillHub / TTS Core 1.8.38:
  /avatar status         mostra estado/eventos para janela externa
  /avatar teste          grava evento de teste para UI/Godot ler
  /avatar eventos        mostra últimos eventos JSONL
  /avatar emote happy    grava evento de expressão
  /avatar state thinking muda estado central: idle/listening/thinking/responding/error
  /avatar dizer texto    grava evento de fala/texto sem mexer no TTS
  /bridge status         alias genérico para /avatar status
  /godot status          alias para integração futura

Navegador:
  abra youtube
  abra youtube e pesquise anime
  /site add nome https://site.com
  /sites
"""

class YoruApp:
    def __init__(self, mode: str = 'text'):
        self.config = load_config()
        self.mode = mode
        self.events = EventBus(self.config)
        self.runtime_state = RuntimeState(self.config, self.events)
        self.avatar = AvatarBridge(self.config, self.events, self.runtime_state)
        self.vault = VaultStore(self.config)
        self.browser = BrowserSkill(self.config)
        self.apps = AppInventorySkill(self.config)
        self.desktop = DesktopContextSkill(self.config, self.vault)
        self.missing = MissingSkills(self.config, self.vault)
        self.downloader = DownloadManager(self.config)
        self.web = WebKnowledge(self.config, self.vault)
        self.models = ModelRouter(self.config)
        self.tts = TTSManager(self.config)
        self.stt = STTEngine(self.config)
        self.tts.on_speech_start = self._on_tts_start
        self.tts.on_speech_end = self._on_tts_end
        self.tts.on_audio_ready = self._on_tts_audio_ready
        self.history: List[Tuple[str, str]] = []
        self.session_lines: List[str] = []
        self.last_reply: str = ""
        self.perf = PerfStats()
        rcfg = self.config.get('runtime', {})
        self.response_cache = ResponseCache(bool(rcfg.get('response_cache_enabled', True)), int(rcfg.get('response_cache_ttl_sec', 300)), int(rcfg.get('response_cache_max_items', 80)))

    def print_status(self):
        print('\n=== Yoru Bridge Modern 1.8.44 - RepoOrganized ===')
        print(f"Modo: {self.mode}")
        print(f"Vault: {self.vault.path}")
        print(f"FAST:  {self.config['models']['fast']['api_url']} | {self.config['models']['fast']['label']}")
        print(f"THINK: {self.config['models']['think']['api_url']} | {self.config['models']['think']['label']}")
        print(f"Cérebro: {self.config.get('runtime', {}).get('brain_mode', 'auto')} | FastBrain: {self.config.get('runtime', {}).get('fast_brain_preset', '-')}")
        print(self.tts.status())
        print(self.web.status())
        print(self.apps.status())
        print(self.desktop.status())
        print(self.missing.status())
        print(self.avatar.status().splitlines()[0])
        print('Digite /ajuda, /baixar status, /skills status, /contratos status, /apps favoritos, /avatar status ou /sair. Embedded: python -m yoru_bridge embedded\n')

    def run(self):
        self.vault.ensure()
        self.print_status()
        if self.mode == 'voice':
            print('Chat de Voz: aperte ENTER vazio para /ouvir, ou digite texto.')
        elif self.mode == 'stream':
            return self.start_stream()
        while True:
            try:
                raw = input('Você: ')
            except (EOFError, KeyboardInterrupt):
                print('\nSaindo...')
                return
            if self.mode == 'voice' and not raw.strip():
                raw = '/ouvir'
            if self.handle_input(raw) == 'exit':
                return

    def handle_input(self, raw: str) -> str | None:
        raw = (raw or '').strip()
        if not raw:
            return None
        raw_l = raw.lower()
        if raw_l == '/ajuda':
            print(HELP)
            return None
        if raw_l in {'/mega', '/mega status', '/mega check', '/diagnostico pack', '/diagnóstico pack', '/pack check'}:
            print(run_pack_healthcheck(self.config))
            return None
        if raw_l == '/baixar' or raw_l.startswith('/baixar ') or raw_l == '/download' or raw_l.startswith('/download ') or raw_l == '/downloads' or raw_l.startswith('/downloads '):
            print(self.downloader.handle(raw))
            self.config = load_config()
            self.downloader = DownloadManager(self.config)
            return None
        if raw_l == '/noelle' or raw_l.startswith('/noelle ') or raw_l == '/kobold' or raw_l.startswith('/kobold '):
            from .integrations.noelle_kobold import handle_noelle_kobold_command
            self.say(handle_noelle_kobold_command(raw, self.config), local=True)
            return None
        if raw_l == '/api' or raw_l.startswith('/api '):
            self.say('API HTTP foi removida do caminho principal. Use python -m yoru_bridge embedded ou /noelle status.', local=True)
            return None
        if raw_l == '/scope' or raw_l.startswith('/scope '):
            ans = handle_scope_command(raw, self.config, save_config)
            if ans is not None:
                self.say(ans, local=True)
            return None
        if raw_l == '/contratos' or raw_l.startswith('/contratos '):
            ans = handle_contracts_command(raw, self.config, save_config)
            if ans is not None:
                self.say(ans, local=True)
            return None
        if is_skills_question(raw):
            self.say(handle_skills_command(raw, self.config), local=True)
            return None
        if self.avatar.looks_like_command(raw):
            self.say(self.avatar.handle(raw), local=True)
            return None
        if self.missing.looks_like_command(raw):
            ans = self.missing.handle(raw)
            if ans is not None:
                self.say(ans, local=True)
                return None
        if raw_l == '/config':
            print(CONFIG_PATH)
            return None
        if raw_l.startswith('/modelo '):
            # /modelo status/diagnostico/portas é diagnóstico local; /cerebro controla roteamento.
            if self.desktop.looks_like_command(raw):
                ans = self.desktop.handle(raw) or 'Não entendi o comando de modelo.'
                self.say(ans, local=True)
                return None
            self.handle_brain_command(raw)
            return None
        if raw_l.startswith('/cerebro'):
            self.handle_brain_command(raw)
            return None
        if raw_l.startswith('/fastbrain'):
            self.handle_fastbrain_command(raw)
            return None
        if raw_l == '/perf':
            rt = self.config.get('runtime', {})
            mem = self.config.get('memory', {})
            print(f"Modo velocidade: {rt.get('speed_mode')} | cerebro={rt.get('brain_mode','auto')} | fastbrain={rt.get('fast_brain_preset','-')} | streamout={rt.get('stream_model_output')} | autospeed={rt.get('autospeed_enabled')} | histórico FAST={rt.get('fast_history_turns')} THINK={rt.get('think_history_turns')} | skip_memory_fast={rt.get('skip_memory_for_fast')} | memória={mem.get('strategy')} ttl={mem.get('cache_ttl_sec')}s | {self.response_cache.status()} | {self.perf.summary()}")
            return None
        if raw_l == '/cache':
            print(self.response_cache.status())
            return None
        if raw_l == '/cache clear':
            n = self.response_cache.clear()
            print(f'[OK] Cache limpo: {n} item(ns).')
            return None
        if raw_l == '/streamout on':
            self.config.setdefault('runtime', {})['stream_model_output'] = True
            save_config(self.config)
            print('[OK] Saída incremental ligada.')
            return None
        if raw_l == '/streamout off':
            self.config.setdefault('runtime', {})['stream_model_output'] = False
            save_config(self.config)
            print('[OK] Saída incremental desligada.')
            return None
        if raw_l.startswith('/stream'):
            self.handle_stream_command(raw)
            return None
        if raw_l == '/warmup':
            self.warmup_models()
            return None
        if raw_l == '/turbo':
            rt = self.config.setdefault('runtime', {})
            rt.update({'speed_mode':'turbo','fast_history_turns':0,'think_history_turns':1,'history_turns':1,'skip_memory_for_fast':True,'prompt_token_budget_chars':1600})
            self.config.setdefault('memory', {})['max_chars_per_file'] = 360
            save_config(self.config)
            print('[OK] Modo turbo ativado: prompts menores, cache ligado e respostas mais rápidas.')
            return None
        if raw_l == '/normal':
            rt = self.config.setdefault('runtime', {})
            rt.update({'speed_mode':'normal','fast_history_turns':1,'think_history_turns':2,'history_turns':2,'skip_memory_for_fast':False,'prompt_token_budget_chars':3600})
            self.config.setdefault('memory', {})['max_chars_per_file'] = 900
            save_config(self.config)
            print('[OK] Modo normal ativado: mais contexto, porém mais lento.')
            return None
        if raw_l == '/autospeed on':
            self.config.setdefault('runtime', {})['autospeed_enabled'] = True
            save_config(self.config)
            print('[OK] AutoSpeed ligado. Se uma resposta passar do limite, a Bridge reduz contexto temporariamente.')
            return None
        if raw_l == '/autospeed off':
            self.config.setdefault('runtime', {})['autospeed_enabled'] = False
            save_config(self.config)
            print('[OK] AutoSpeed desligado.')
            return None
        if raw_l == '/fastvoice off':
            self.config.setdefault('tts', {})['speak_fast_model'] = False
            save_config(self.config)
            print('[OK] TTS das respostas FAST desligado. Local e THINK continuam conforme config.')
            return None
        if raw_l == '/fastvoice on':
            self.config.setdefault('tts', {})['speak_fast_model'] = True
            save_config(self.config)
            print('[OK] TTS das respostas FAST ligado.')
            return None
        if raw_l in {'/check','/modelos','/modelo status'}:
            print('CÉREBRO:', self.config.get('runtime', {}).get('brain_mode', 'auto'))
            cfg_models = self.config.get('models', {})
            paths = self.config.get('model_paths', {})
            print('FAST:', cfg_models.get('fast', {}).get('label'), '|', cfg_models.get('fast', {}).get('api_url'))
            print('FAST path:', paths.get('fast_model_path'))
            print('THINK:', cfg_models.get('think', {}).get('label'), '|', cfg_models.get('think', {}).get('api_url'))
            print('THINK path:', paths.get('think_model_path'))
            for k, v in self.models.check().items():
                print(f'[{k.upper()}] {v}')
            return None
        if raw_l == '/exportar':
            p = self.vault.export_session(self.session_lines)
            print(f'[OK] Sessão exportada: {p}')
            return None
        if raw_l.startswith('/salvar '):
            p = self.vault.append_memory('05_MEMORIA/memoria_manual.md', raw[8:])
            print(f'[OK] Salvo em {p}')
            return None
        if self.desktop.looks_like_command(raw):
            clip_req = self.desktop.clip_model_request(raw)
            if clip_req is not None:
                clip_text, instruction = clip_req
                if not clip_text:
                    self.say('Clipboard vazio ou inacessível.', local=True)
                else:
                    self.ask_model(instruction + '\n\nConteúdo do clipboard:\n' + clip_text[:6000], 'think', 'technical', explicit_model=False)
                return None
            ans = self.desktop.handle(raw)
            if ans is not None:
                self.say(ans, local=True)
                return None
        if raw_l.startswith('/apps') or raw_l.startswith('/programas'):
            ans = self.apps.handle(raw) or 'Não entendi o comando de programas.'
            self.say(ans, local=True)
            return None
        if self.apps.looks_like_app_command(raw):
            ans = self.apps.handle(raw)
            if ans is not None:
                self.say(ans, local=True)
                return None
        if raw_l.startswith('/web'):
            self.handle_web_command(raw)
            return None
        if raw_l.startswith('/pesquisa') or raw_l in {'pesquisa','pesquisar','modo pesquisa','ativar modo pesquisa','desativar modo pesquisa'}:
            self.handle_search_command(raw)
            return None
        if self.config.get('runtime', {}).get('search_mode_enabled', False) and not raw_l.startswith('/'):
            # Em modo pesquisa, comandos de site continuam abrindo navegador.
            # Perguntas normais viram busca + resposta com fontes.
            ans_browser = self.browser.handle(raw)
            if ans_browser and self.browser.looks_like_command(raw):
                self.say(ans_browser, local=True)
            else:
                self.answer_with_web(raw)
            return None

        route = route_message(raw, self.config.get('runtime',{}).get('default_model','auto'))
        if route.kind == 'exit':
            return 'exit'
        if route.kind == 'menu':
            print('Use /sair para sair desta Bridge e voltar ao menu do iniciar.bat.')
            return None
        if route.kind == 'voice':
            self.handle_voice_command(raw)
            return None
        if route.kind == 'stream':
            self.start_stream()
            return None
        if route.kind == 'avatar':
            self.say(self.avatar.handle(raw), local=True)
            return None
        if route.kind == 'apps':
            ans = self.apps.handle(raw) or 'Não entendi o comando de programas.'
            self.say(ans, local=True)
            return None
        if route.kind == 'desktop':
            ans = self.desktop.handle(raw) or 'Não entendi o comando de desktop.'
            self.say(ans, local=True)
            return None
        if route.kind == 'downloader':
            print(self.downloader.handle(raw))
            self.config = load_config()
            self.downloader = DownloadManager(self.config)
            return None
        if route.kind == 'skills':
            self.say(handle_skills_command(raw, self.config), local=True)
            return None
        if route.kind == 'browser':
            ans = self.browser.handle(raw) or 'Não entendi o comando de navegador.'
            self.say(ans, local=True)
            return None
        if route.kind == 'local':
            self.say(route.payload, local=True)
            return None
        if route.kind == 'none':
            return None
        # Segurança: comando começando com / que não foi reconhecido não deve ir para o modelo alucinar.
        recognized_model_cmd = any(raw_l == p or raw_l.startswith(p + ' ') for p in ['/fast','/think','/dual','/tecnico','/técnico','/projeto','/saber','/criativo'])
        if raw_l.startswith('/') and route.kind == 'model' and not recognized_model_cmd:
            print('Comando não reconhecido. Use /ajuda. Exemplos: /think texto, /saber texto, /web texto.')
            return None
        payload = route.payload or raw
        explicit_model = raw_l.startswith('/fast') or raw_l.startswith('/think') or raw_l.startswith('/dual')
        # Web Knowledge Fallback: se a pergunta for atual/recente ou pedir pesquisa,
        # busca antes de deixar o modelo inventar.
        if (not explicit_model) and route.kind == 'model' and self.web.should_auto_search(payload, route.profile):
            self.answer_with_web(payload)
            return None
        self.ask_model(payload, route.model, route.profile, explicit_model=explicit_model)
        return None

    def ask_model(self, text: str, model_key: str = 'auto', profile: str = 'companion', explicit_model: bool = False) -> str:
        rt = self.config.get('runtime', {})
        brain_mode = str(rt.get('brain_mode', 'auto')).lower()
        if model_key == 'dual':
            return self.ask_dual_model(text, profile)
        if not explicit_model:
            if brain_mode in {'fast', '0.8b', '08b', 'rapido', 'rápido'}:
                model_key = 'fast'
            elif brain_mode in {'think', '2b', 'qwen2b'}:
                model_key = 'think'
            elif brain_mode in {'dual', 'duplo', 'dois'}:
                return self.ask_dual_model(text, profile)
        if model_key == 'auto':
            model_key = 'think' if profile in {'technical','project','knowledge'} else 'fast'
        # FastBrain guard: se a pergunta ficou grande/complexa demais para o FAST, sobe para THINK
        # quando o usuário não forçou /fast. Isso melhora qualidade sem travar conversa leve.
        if (not explicit_model and model_key == 'fast' and rt.get('fast_auto_escalate_to_think', True)):
            if len(text) > int(rt.get('fast_auto_escalate_chars', 360)):
                model_key = 'think'
                profile = 'technical' if profile == 'companion' else profile
        cached = self.response_cache.get(text, model_key, profile)
        if cached:
            self.say(cached, local=False)
            print(f'[cache hit | modelo: {model_key} | perfil: {profile}]')
            return cached
        t_mem0 = time.time()
        # AutoSpeed: quando o PC começa a sofrer, reduz contexto temporariamente.
        autospeed = bool(rt.get('autospeed_enabled', True)) and self.perf.autospeed_active()
        if autospeed and model_key == 'think' and profile not in {'technical'} and rt.get('think_to_fast_on_latency', True):
            model_key = 'fast'
            profile = 'companion'
        memory = '' if autospeed else self.vault.read_memory(profile, model_key=model_key)
        self.perf.mark('memoria', time.time() - t_mem0)
        t_prompt0 = time.time()
        scope_extra = ''
        scope_max_tokens = None
        if rt.get('answer_scope_enabled', True):
            scope_extra = build_scope_instruction(text, self.config)
            scope_max_tokens = max_tokens_for_scope(text, self.config, model_key=model_key)
            if rt.get('scope_debug', False):
                sc = classify_answer_scope(text)
                print(f'[scope: {sc.kind} | {sc.label} | detalhe={sc.detail_allowed}]')
        system = build_prompt(profile, memory, extra=scope_extra, model_key=model_key)
        self.perf.mark('prompt', time.time() - t_prompt0)
        if model_key == 'fast':
            hist_turns = 0 if autospeed else int(rt.get('fast_history_turns', 0))
        else:
            hist_turns = 1 if autospeed else int(rt.get('think_history_turns', rt.get('history_turns', 1)))
        hist = self.history[-hist_turns:] if hist_turns > 0 else []
        t0 = time.time()
        printed_stream = {'used': False}
        def on_token(tok: str):
            if not printed_stream['used']:
                print('Yoru: ', end='', flush=True)
                printed_stream['used'] = True
            print(tok, end='', flush=True)
        # A UI/avatar externa pode mostrar estado pensando sem depender do TTS.
        self.runtime_state.set_state('thinking', source='ask_model', model=model_key, profile=profile)
        # No modo THINK fixo ou em perguntas de conhecimento, é melhor mostrar erro do THINK
        # do que cair para FAST e inventar resposta ruim.
        old_fallback = rt.get('fallback_to_fast', True)
        force_no_fast_fallback = (model_key == 'think' and (brain_mode in {'think', '2b', 'qwen2b'} or profile == 'knowledge' or explicit_model))
        if force_no_fast_fallback:
            rt['fallback_to_fast'] = False
        model_text = text
        if model_key == 'fast' and rt.get('fast_force_short_prompt', True):
            lim = int(rt.get('fast_max_input_chars', 900))
            if lim > 0 and len(model_text) > lim:
                model_text = model_text[:lim].rstrip() + '\n[texto cortado para manter FAST rápido]'
        old_max_tokens = None
        if scope_max_tokens and model_key in self.config.get('models', {}):
            old_max_tokens = self.config['models'][model_key].get('max_tokens')
            self.config['models'][model_key]['max_tokens'] = int(scope_max_tokens)
        try:
            ans, used, streamed = self.models.complete(model_key, system, model_text, hist, profile, on_token if rt.get('stream_model_output', True) else None)
        finally:
            rt['fallback_to_fast'] = old_fallback
            if old_max_tokens is not None:
                self.config['models'][model_key]['max_tokens'] = old_max_tokens
        dt = time.time() - t0
        self.perf.mark('modelo', dt)
        self.perf.add_latency(dt, float(rt.get('autospeed_latency_sec', 18)), float(rt.get('autospeed_decay_sec', 120)))
        ans = self._postprocess_model_answer(ans, used, profile)
        self.runtime_state.set_state('responding', source='ask_model', model=used, profile=profile)
        if printed_stream['used']:
            print()
            self.say(ans, local=False, print_text=False, model_key=used)
        else:
            self.say(ans, local=False, model_key=used)
        self._finish_response_state('ask_model', model=used, profile=profile)
        extra_perf = f" | autospeed={'ON' if self.perf.autospeed_active() else 'OFF'}" if rt.get('print_perf_breakdown', True) else ''
        print(f'[tempo: {dt:.1f}s | modelo: {used} | perfil: {profile} | stream={streamed} | mem={len(memory)} chars | hist={len(hist)}{extra_perf}]')
        self.response_cache.set(text, used, profile, ans)
        self.history.append((text, ans))
        self.session_lines.append(f'**Você:** {text}\n\n**Yoru:** {ans}\n')
        self.process_memory_marker(ans)
        return ans

    def handle_search_command(self, raw: str):
        n = normalize(raw)
        rt = self.config.setdefault('runtime', {})
        if n in {'/pesquisa on', 'pesquisa on', 'modo pesquisa', 'ativar modo pesquisa'}:
            rt['search_mode_enabled'] = True
            save_config(self.config)
            self.say('Modo pesquisa ligado. Perguntas normais agora usam internet + THINK quando precisar. Use /pesquisa off para desligar.', local=True)
            return
        if n in {'/pesquisa off', 'pesquisa off', 'desativar modo pesquisa'}:
            rt['search_mode_enabled'] = False
            save_config(self.config)
            self.say('Modo pesquisa desligado. Voltei para chat normal.', local=True)
            return
        if n in {'/pesquisa', 'pesquisa', '/pesquisa status', 'pesquisa status'}:
            status = 'ligado' if rt.get('search_mode_enabled', False) else 'desligado'
            self.say(f'Modo pesquisa está {status}. Use /pesquisa on, /pesquisa off ou /pesquisa sua pergunta.', local=True)
            return
        q = raw.split(' ', 1)[1].strip() if ' ' in raw else ''
        if q:
            # Se for pesquisa em site conhecido, abre o site; senão busca e responde.
            ans_browser = self.browser.handle(q)
            if ans_browser and self.browser.looks_like_command(q):
                self.say(ans_browser, local=True)
            else:
                self.answer_with_web(q)
        else:
            self.say('Use /pesquisa on ou /pesquisa texto. Exemplo: /pesquisa melhores animes 2026.', local=True)

    def handle_web_command(self, raw: str):
        n = normalize(raw)
        cfg = self.config.setdefault('web_knowledge', {})
        if n in {'/web', '/web status'}:
            self.say(self.web.status(), local=True)
            return
        if n == '/web on':
            cfg['enabled'] = True
            cfg['auto_web_fallback'] = True
            save_config(self.config)
            self.web = WebKnowledge(self.config, self.vault)
            self.say('Web Knowledge ligado. Perguntas atuais podem pesquisar antes de responder.', local=True)
            return
        if n == '/web off':
            cfg['auto_web_fallback'] = False
            save_config(self.config)
            self.web = WebKnowledge(self.config, self.vault)
            self.say('Web Knowledge automático desligado. /web pergunta ainda funciona se enabled estiver ligado.', local=True)
            return
        if n == '/web cache clear':
            total = self.web.clear_cache()
            self.say(f'Cache web limpo: {total} item(ns).', local=True)
            return
        q = raw.split(' ', 1)[1].strip() if ' ' in raw else ''
        if q:
            self.answer_with_web(q)
        else:
            self.say('Use /web pergunta. Exemplo: /web melhor anime atual.', local=True)

    def answer_with_web(self, question: str):
        sc = classify_answer_scope(question)
        if sc.kind == 'list_only':
            self.say('Vou pesquisar e trazer só a lista pedida.', local=True)
        elif sc.kind in {'yes_no_fact','date_fact','short_fact'}:
            self.say('Vou pesquisar e responder direto ao ponto.', local=True)
        else:
            self.say('Vou pesquisar rápido e responder com base no que encontrar.', local=True)
        t0 = time.time()
        ans, used = self.web.answer_with_sources(question, self.models, profile='knowledge')
        dt = time.time() - t0
        self.say(ans, local=False, model_key='think')
        print(f'[web: {dt:.1f}s | busca={used} | cache={self.web.cache_file.name}]')
        self.history.append((question, ans))
        self.session_lines.append(f'**Você:** {question}\n\n**Yoru/Web:** {ans}\n')
        return ans


    def handle_fastbrain_command(self, raw: str):
        parts = raw.split()
        cfg = self.config
        rt = cfg.setdefault('runtime', {})
        models = cfg.setdefault('models', {})
        profiles = cfg.setdefault('model_profiles', {})
        if len(parts) == 1 or parts[1].lower() in {'status','estado'}:
            print('FastBrain atual:', rt.get('fast_brain_preset', 'fast_qwen35_08b_turbo'))
            print('FAST:', models.get('fast', {}))
            print('Opções: /fastbrain turbo | /fastbrain plus | /fastbrain gemma')
            print('turbo=Qwen3.5 0.8B; plus=Qwen3 1.7B; gemma=Gemma 3 1B experimental.')
            return
        mode = parts[1].lower().strip()
        alias = {
            'turbo': 'fast_qwen35_08b_turbo',
            '08b': 'fast_qwen35_08b_turbo',
            '0.8b': 'fast_qwen35_08b_turbo',
            'qwen35': 'fast_qwen35_08b_turbo',
            'plus': 'fast_qwen3_17b_balanced',
            '1.7b': 'fast_qwen3_17b_balanced',
            '17b': 'fast_qwen3_17b_balanced',
            'qwen3': 'fast_qwen3_17b_balanced',
            'gemma': 'fast_gemma3_1b_alt',
            '1b': 'fast_gemma3_1b_alt',
        }
        key = alias.get(mode, mode)
        if key not in profiles or not key.startswith('fast_'):
            print('Preset inválido. Use: /fastbrain turbo, /fastbrain plus ou /fastbrain gemma')
            return
        p = profiles[key]
        f = models.setdefault('fast', {})
        f['label'] = p.get('label', f.get('label', 'Yoru FAST'))
        f['temperature'] = p.get('temperature', f.get('temperature', 0.24))
        f['max_tokens'] = p.get('max_tokens', f.get('max_tokens', 72))
        for k in ('top_p','top_k','min_p','repeat_penalty'):
            if k in p:
                f[k] = p[k]
        cfg.setdefault('model_paths', {})['fast_model_path'] = p.get('path', cfg.get('model_paths', {}).get('fast_model_path',''))
        rt['fast_brain_preset'] = key
        rt['brain_mode'] = 'auto'
        save_config(cfg)
        print(f"[OK] FastBrain aplicado: {p.get('label')} | porta {p.get('port', 5001)}")
        print('Depois gere os BATs em Modelos > Gerar .bat FAST/THINK se mudou o caminho do modelo.')

    def _postprocess_model_answer(self, ans: str, used: str, profile: str) -> str:
        rt = self.config.get('runtime', {})
        out = ans or ''
        if used == 'fast' and rt.get('fast_strip_think_blocks', True):
            import re
            out = re.sub(r'<think>.*?</think>', '', out, flags=re.I | re.S).strip()
            out = re.sub(r'</?think>', '', out, flags=re.I).strip()
        if used == 'fast' and rt.get('fast_quality_guard', True) and profile in {'companion','creative'}:
            limit = int(rt.get('fast_answer_max_chars', 520))
            if limit > 0 and len(out) > limit:
                cut = out[:limit].rsplit('.', 1)[0].strip()
                out = (cut if len(cut) > 80 else out[:limit].strip()) + '...'
        return out.strip()

    def handle_brain_command(self, raw: str):
        parts = raw.split()
        rt = self.config.setdefault('runtime', {})
        if len(parts) == 1 or (len(parts) == 2 and parts[1].lower() in {'status','estado'}):
            mode = rt.get('brain_mode', 'auto')
            print(f"Cérebro atual: {mode}")
            print("Opções: /cerebro auto | /cerebro fast | /cerebro think | /cerebro dual")
            print("auto/ambos = roteia entre 0.8B e 2B; fast = só 0.8B; think = só 2B sem fallback para FAST; dual = FAST rascunha + THINK revisa.")
            return
        mode = parts[1].lower().replace(',', '.').strip()
        aliases = {
            'ambos':'auto', 'both':'auto', 'automatico':'auto', 'automático':'auto',
            'rapido':'fast', 'rápido':'fast', '0.8b':'fast', '08b':'fast', '0,8b':'fast', 'qwen08':'fast',
            '2b':'think', 'qwen2b':'think', 'forte':'think', 'pensar':'think',
            'duplo':'dual', 'dois':'dual', '2cerebros':'dual', '2cérebros':'dual'
        }
        mode = aliases.get(mode, mode)
        if mode not in {'auto','fast','think','dual'}:
            print('Modo inválido. Use: /cerebro auto, /cerebro fast, /cerebro think ou /cerebro dual')
            return
        rt['brain_mode'] = mode
        save_config(self.config)
        if mode == 'auto':
            print('[OK] Cérebro em AUTO/AMBOS: a Bridge escolhe FAST ou THINK conforme a pergunta.')
        elif mode == 'fast':
            print('[OK] Cérebro fixo no FAST: Qwen3.5 0.8B será usado para quase tudo.')
        elif mode == 'think':
            print('[OK] Cérebro fixo no THINK: Qwen3.5 2B será usado para quase tudo.')
        elif mode == 'dual':
            print('[OK] Cérebro DUAL ligado: FAST faz rascunho e THINK revisa. É mais lento, use quando quiser qualidade.')

    def ask_dual_model(self, text: str, profile: str = 'technical') -> str:
        rt = self.config.get('runtime', {})
        t_mem0 = time.time()
        memory = self.vault.read_memory(profile, model_key='think')
        self.perf.mark('memoria', time.time() - t_mem0)
        base_system = build_prompt(profile, memory)
        t0 = time.time()
        self.runtime_state.set_state('thinking', source='ask_dual_model', model='dual', profile=profile)
        fast_prompt = "Você é o cérebro rápido da Yoru. Faça um rascunho curto, direto e útil. Não use Markdown decorativo."
        try:
            fast_ans, fast_used, _ = self.models.complete('fast', fast_prompt, text, [], profile, None)
        except Exception as e:
            fast_ans, fast_used = f"[rascunho FAST falhou: {e}]", 'fast'
        dual_text = (
            "Pergunta do usuário:\n" + text +
            "\n\nRascunho do cérebro rápido 0.8B:\n" + fast_ans +
            "\n\nAgora responda como cérebro THINK 2B. Corrija o rascunho, seja direto e não invente."
        )
        hist_turns = int(rt.get('think_history_turns', rt.get('history_turns', 1)))
        hist = self.history[-hist_turns:] if hist_turns > 0 else []
        printed_stream = {'used': False}
        def on_token(tok: str):
            if not printed_stream['used']:
                print('Yoru: ', end='', flush=True)
                printed_stream['used'] = True
            print(tok, end='', flush=True)
        try:
            ans, used, streamed = self.models.complete('think', base_system, dual_text, hist, profile, on_token if rt.get('stream_model_output', True) else None)
            if not ans or ans.startswith('[ERRO MODELO]'):
                ans = fast_ans + "\n\n[aviso] THINK falhou no modo dual; usei o rascunho FAST."
                used = 'fast'
                streamed = False
        except Exception as e:
            ans = fast_ans + f"\n\n[aviso] THINK falhou no modo dual: {e}"
            used = 'fast'
            streamed = False
        dt = time.time() - t0
        self.perf.mark('modelo', dt)
        self.perf.add_latency(dt, float(rt.get('autospeed_latency_sec', 18)), float(rt.get('autospeed_decay_sec', 120)))
        self.runtime_state.set_state('responding', source='ask_dual_model', model=used, profile=profile)
        if printed_stream['used']:
            print()
            self.say(ans, local=False, print_text=False, model_key=used)
        else:
            self.say(ans, local=False, model_key=used)
        self._finish_response_state('ask_dual_model', model=used, profile=profile)
        print(f'[tempo: {dt:.1f}s | cerebro=dual | fast={fast_used} + think={used} | perfil={profile} | mem={len(memory)} chars | hist={len(hist)}]')
        self.history.append((text, ans))
        self.session_lines.append(f'**Você:** {text}\n\n**Yoru:** {ans}\n')
        self.process_memory_marker(ans)
        return ans

    def warmup_models(self):
        print('[WARMUP] Testando FAST e THINK com chamada curta. Isso pode demorar na primeira vez.')
        for key, profile in [('fast','companion'), ('think','technical')]:
            t0 = time.time()
            try:
                ans, used, _ = self.models.complete(key, 'Responda apenas: ok', 'ok', [], profile, None)
                print(f'[{key.upper()}] {used} ok em {time.time()-t0:.1f}s -> {ans[:40]}')
            except Exception as e:
                print(f'[{key.upper()}][ERRO] {e}')


    def _finish_response_state(self, source: str, **meta):
        """Não sobrescreve speaking/queue de TTS com idle cedo demais."""
        try:
            if self.tts.is_busy():
                return
        except Exception:
            pass
        try:
            if getattr(self.runtime_state, 'current', '') != 'speaking':
                self.runtime_state.set_state('idle', source=source, **meta)
        except Exception:
            pass

    def say(self, text: str, local: bool = False, print_text: bool = True, model_key: str | None = None):
        self.last_reply = text or ""
        if print_text:
            print('Yoru:', text)
        tcfg = self.config.get('tts', {})
        speak_local = tcfg.get('speak_local', True)
        speak_model = tcfg.get('speak_model', True)
        if model_key == 'fast' and not tcfg.get('speak_fast_model', True):
            speak_model = False
        if model_key == 'think' and not tcfg.get('speak_think_model', True):
            speak_model = False
        self.avatar.emit_say(text, local=local, model_key=model_key)
        should_speak = (local and speak_local) or ((not local) and speak_model)
        self.tts.speak(text) if should_speak else False

    def _on_tts_start(self, text: str):
        try:
            self.runtime_state.set_state('speaking', source='tts', text_preview=(text or '')[:120])
            if self.config.get('tts', {}).get('emit_avatar_events', True):
                self.events.emit('tts_start', {'text': (text or '')[:500], 'engine': self.tts.last_engine or self.config.get('tts', {}).get('engine'), 'player': self.config.get('tts', {}).get('player')})
        except Exception:
            pass

    def _on_tts_end(self, text: str, ok: bool = True):
        try:
            if self.config.get('tts', {}).get('emit_avatar_events', True):
                self.events.emit('tts_end', {'ok': bool(ok), 'text_preview': (text or '')[:160], 'file': self.tts.last_file or None, 'engine': self.tts.last_engine or None, 'player': self.tts.last_player or None})
            if getattr(self.runtime_state, 'current', '') == 'speaking':
                self.runtime_state.set_state('idle', source='tts', ok=bool(ok))
        except Exception:
            pass

    def _on_tts_audio_ready(self, path: str, text: str):
        try:
            if self.config.get('tts', {}).get('emit_avatar_events', True):
                self.events.emit('audio_ready', {'path': path, 'text_preview': (text or '')[:160]})
        except Exception:
            pass

    def process_memory_marker(self, ans: str):
        marker = '[guardar no Obsidian]'
        for line in ans.splitlines():
            if marker.lower() in line.lower():
                text = line.split(']',1)[-1].strip() if ']' in line else line.replace(marker,'').strip()
                if text:
                    p = self.vault.append_memory('05_MEMORIA/memoria_automatica.md', text)
                    print(f'[MEMÓRIA] Salvo em {p.name}: {text}')

    def handle_voice_command(self, raw: str):
        original_raw = raw
        n = raw.strip().lower()
        # /tts é alias moderno de /voz para a camada TTSControl.
        if n == '/tts':
            n = '/voz status'
        elif n.startswith('/tts '):
            if n.startswith('/tts player '):
                player = original_raw.split(' ', 2)[2].strip() if len(original_raw.split(' ', 2)) >= 3 else ''
                print(self.tts.set_player(player))
                return
            if n == '/tts status':
                n = '/voz status'
            elif n in {'/tts diagnostico', '/tts diagnóstico'}:
                n = '/voz diagnostico'
            elif n == '/tts teste':
                n = '/voz teste'
            elif n == '/tts parar':
                n = '/pararvoz'
            elif n.startswith('/tts dizer '):
                original_raw = '/falar ' + original_raw.split(' ', 2)[2]
                n = original_raw.lower()
        if n == '/voz status':
            print(self.tts.status())
        elif n == '/voz diagnostico':
            print(self.tts.diagnose())
        elif n == '/voz fila':
            print(self.tts.status())
        elif n == '/voz reset':
            print(self.tts.reset())
        elif n in {'/voz semmarkdown','/voz markdown off','/voz limpar markdown'}:
            self.config.setdefault('tts', {})['strip_markdown_for_tts'] = True
            save_config(self.config)
            print('Limpeza de Markdown para TTS ligada. A voz não deve falar asterisco/asterisco.')
        elif n in {'/voz persistente','/voz tudo','/voz persistente on'}:
            print(self.tts.apply_persistent_mode())
        elif n == '/voz on':
            print(self.tts.set_enabled(True))
        elif n == '/voz off':
            print(self.tts.set_enabled(False))
        elif n == '/voz edge':
            print(self.tts.set_engine('edge'))
        elif n == '/voz windows':
            print(self.tts.set_engine('windows'))
        elif n in {'/voz player pygame', '/voz pygame'}:
            print(self.tts.set_player('pygame'))
        elif n in {'/voz player externo', '/voz player external', '/voz externo'}:
            print(self.tts.set_player('external'))
        elif n == '/voz modelo on':
            print(self.tts.set_model_speaking(model=True))
        elif n == '/voz modelo off':
            print(self.tts.set_model_speaking(model=False))
        elif n == '/voz fast on':
            print(self.tts.set_model_speaking(fast=True))
        elif n == '/voz fast off':
            print(self.tts.set_model_speaking(fast=False))
        elif n == '/voz think on':
            print(self.tts.set_model_speaking(think=True))
        elif n == '/voz think off':
            print(self.tts.set_model_speaking(think=False))
        elif n in {'/testarvoz','/voz teste'}:
            self.tts.speak('Oi, eu sou a Yoru. Teste de voz persistente funcionando.', force=True)
        elif n.startswith('/falar '):
            self.tts.speak(original_raw[7:], force=True)
        elif n == '/pararvoz':
            print(self.tts.stop())
        elif n == '/limparvoz':
            print(self.tts.clear_cache())
        elif n == '/stt diagnostico':
            print(self.stt.diagnose())
        elif n.startswith('/ctrlvoz'):
            try:
                text = self.stt.listen_ctrl()
            except Exception as e:
                print(f'[CTRLVOZ][ERRO] {e}')
                return
            print(f'[TRANSCRIÇÃO] {text}')
            if text:
                self.handle_input(text)
        elif n.startswith('/ouvir'):
            try:
                secs = int(raw.split(' ',1)[1]) if ' ' in raw else None
            except Exception:
                secs = None
            try:
                text = self.stt.listen_once(secs)
            except Exception as e:
                print(f'[STT][ERRO] {e}')
                return
            print(f'[TRANSCRIÇÃO] {text}')
            if text:
                self.handle_input(text)
        else:
            print('Comando de voz não reconhecido. Use /ajuda.')

    def start_stream(self):
        self.runtime_state.set_state('listening', source='stream')
        def on_stream_text(txt: str):
            return self.handle_input(txt)
        controller = StreamController(self.config, on_text=on_stream_text, tts_busy=lambda: self.tts.is_busy())
        try:
            controller.run()
        finally:
            self.runtime_state.set_state('idle', source='stream')

    def handle_stream_command(self, raw: str):
        n = normalize(raw)
        cfg = self.config.setdefault('stream', {})
        if n in {'/stream on','/stream iniciar','/stream start'}:
            self.start_stream(); return
        if n in {'/stream status','/stream','/stream diagnostico','/stream diagnóstico'}:
            controller = StreamController(self.config, on_text=lambda x: None, tts_busy=lambda: self.tts.is_busy())
            print(controller.diagnose()); return
        if n in {'/stream calibrar','/stream calibracao','/stream calibração'}:
            cfg['auto_calibrate'] = True; save_config(self.config); print('[OK] Stream vai calibrar ruído ao iniciar.'); return
        if n == '/stream continuo on':
            cfg['continuous_mode'] = True; cfg['require_wake_word'] = False; save_config(self.config); print('[OK] Stream contínuo ligado.'); return
        if n == '/stream continuo off':
            cfg['continuous_mode'] = False; save_config(self.config); print('[OK] Stream contínuo desligado.'); return
        if n == '/stream wake on':
            cfg['require_wake_word'] = True; save_config(self.config); print('[OK] Stream exige palavra Yoru ou pergunta clara.'); return
        if n == '/stream wake off':
            cfg['require_wake_word'] = False; save_config(self.config); print('[OK] Stream não exige palavra Yoru. Use com cuidado.'); return
        if n.startswith('/stream sensibilidade'):
            try: level = int(n.split()[-1])
            except Exception: print('Use: /stream sensibilidade 1-5'); return
            level = max(1, min(5, level))
            thresholds = {1:0.030, 2:0.022, 3:0.015, 4:0.010, 5:0.007}
            cfg['energy_threshold'] = thresholds[level]; cfg['auto_calibrate'] = False
            save_config(self.config)
            print(f'[OK] Sensibilidade do stream = {level}. threshold={thresholds[level]:.3f}')
            return
        print('Comandos stream: /stream on | /stream status | /stream diagnostico | /stream calibrar | /stream continuo on/off | /stream wake on/off | /stream sensibilidade 1-5')


def main():
    mode = 'text'
    if len(sys.argv) > 1 and sys.argv[1] in {'text','voice','stream','embedded','stdio','companion'}:
        mode = sys.argv[1]
    if mode in {'embedded','stdio','companion'}:
        from .embedded.stdio_chat import run_stdio
        run_stdio()
        return
    YoruApp(mode=mode).run()
