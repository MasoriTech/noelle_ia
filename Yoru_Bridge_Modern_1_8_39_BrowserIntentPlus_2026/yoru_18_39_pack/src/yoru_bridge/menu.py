from __future__ import annotations
import os, subprocess, sys, webbrowser
from pathlib import Path
from .config import PACK_ROOT, load_config, save_config
from .core.downloader import DownloadManager

PYEXE = sys.executable

def run_module(mode: str):
    env = os.environ.copy()
    src = str(PACK_ROOT / 'src')
    env['PYTHONPATH'] = src + os.pathsep + env.get('PYTHONPATH','')
    try:
        subprocess.run([PYEXE, '-m', 'yoru_bridge', mode], cwd=str(PACK_ROOT), env=env)
    except KeyboardInterrupt:
        print('\n[OK] Módulo encerrado pelo usuário. Voltando ao menu sem traceback.')

def pip_install(req: str):
    subprocess.run([PYEXE, '-m', 'pip', 'install', '-r', str(PACK_ROOT / 'requirements' / req)], cwd=str(PACK_ROOT))

def validate():
    import py_compile
    bad = []
    for p in (PACK_ROOT/'src').rglob('*.py'):
        try:
            py_compile.compile(str(p), doraise=True)
            print('[OK]', p.relative_to(PACK_ROOT))
        except Exception as e:
            bad.append((p,e))
            print('[ERRO]', p, e)
    if not bad:
        print('Todos os .py validaram.')

def check_models():
    from .models.router import ModelRouter
    cfg = load_config()
    router = ModelRouter(cfg)
    for name, res in router.check().items():
        print(f'[{name.upper()}] {res}')

def open_config():
    os.startfile(str(PACK_ROOT/'config.json'))

def gen_bats():
    subprocess.run([PYEXE, str(PACK_ROOT/'scripts'/'gerar_kobold_bats.py')], cwd=str(PACK_ROOT))

def menu_chat():
    while True:
        print('''\n=== Menu Chat ===
[1] Chat Texto
[2] Chat de Voz (botão/ENTER vazio ou /ouvir)
[3] Chat Stream ao vivo CT2/Faster-Whisper
[4] Submenu Chat de Voz / TTS + STT
[5] Submenu Chat Stream / Faster-Whisper CT2
[0] Voltar''')
        c = input('Escolha: ').strip()
        if c == '1': run_module('text')
        elif c == '2': run_module('voice')
        elif c == '3': run_module('stream')
        elif c == '4': submenu_voice()
        elif c == '5': submenu_stream()
        elif c == '0': return

def submenu_voice():
    while True:
        print('''\n=== Submenu Chat de Voz / TTS + STT ===
[1] Instalar/atualizar Edge TTS
[2] Instalar/atualizar Faster-Whisper + sounddevice
[3] Instalar CTRL voice opcional (keyboard)
[4] Validar voz/STT pelo diagnóstico
[5] Ligar TTS no config
[6] Desligar TTS no config
[7] Usar Edge TTS
[8] Usar Windows fallback
[9] Aplicar modo VOZ PERSISTENTE
[10] Falar também respostas FAST
[11] Não falar respostas FAST
[12] Diagnóstico TTS detalhado
[13] Resetar voz/falhas
[14] Ligar limpeza de Markdown para TTS
[0] Voltar''')
        c=input('Escolha: ').strip()
        if c=='1': pip_install('requirements_tts_edge.txt')
        elif c=='2': pip_install('requirements_stt.txt')
        elif c=='3': pip_install('requirements_ctrl_voice.txt')
        elif c=='4': subprocess.run([PYEXE, str(PACK_ROOT/'scripts'/'diagnostico_voz.py')], cwd=str(PACK_ROOT))
        elif c=='5':
            cfg=load_config(); cfg['tts']['enabled']=True; save_config(cfg); print('TTS ligado.')
        elif c=='6':
            cfg=load_config(); cfg['tts']['enabled']=False; save_config(cfg); print('TTS desligado.')
        elif c=='7':
            cfg=load_config(); cfg['tts']['engine']='edge'; save_config(cfg); print('Engine: edge')
        elif c=='8':
            cfg=load_config(); cfg['tts']['engine']='windows'; save_config(cfg); print('Engine: windows')
        elif c=='9':
            cfg=load_config(); t=cfg.setdefault('tts', {})
            t.update({'enabled': True, 'engine': 'edge', 'speak_local': True, 'speak_model': True, 'speak_fast_model': True, 'speak_think_model': True, 'voice_persistence_mode': True, 'audio_cache_enabled': False, 'drop_old_when_queue_full': False, 'max_queue': 6})
            save_config(cfg); print('Modo VOZ PERSISTENTE aplicado.')
        elif c=='10':
            cfg=load_config(); cfg.setdefault('tts', {})['speak_fast_model']=True; save_config(cfg); print('FAST também vai falar.')
        elif c=='11':
            cfg=load_config(); cfg.setdefault('tts', {})['speak_fast_model']=False; save_config(cfg); print('FAST não vai falar.')
        elif c=='12':
            from .voice.tts import TTSManager
            print(TTSManager(load_config()).diagnose())
        elif c=='13':
            from .voice.tts import TTSManager
            print(TTSManager(load_config()).reset())
        elif c=='14':
            cfg=load_config(); cfg.setdefault('tts', {})['strip_markdown_for_tts']=True; save_config(cfg); print('Limpeza de Markdown para TTS ligada.')
        elif c=='0': return

def submenu_stream():
    while True:
        cfg = load_config()
        s = cfg.setdefault('stream', {})
        status = "mode={mode} vad={vad} auto_calibrate={cal} threshold={th} continuous={cont} wake={wake}".format(
            mode=s.get('mode'), vad=s.get('vad'), cal=s.get('auto_calibrate'), th=s.get('energy_threshold'), cont=s.get('continuous_mode'), wake=s.get('require_wake_word'))
        print("\n=== Submenu Chat Stream / Faster-Whisper CT2 ===")
        print("Status: " + status)
        print("""
[1] Instalar/atualizar Faster-Whisper + sounddevice
[2] Instalar CTRL voice opcional (keyboard)
[3] Diagnóstico Stream/STT
[4] Aplicar configuração STREAM RÁPIDA CT2
[5] Stream contínuo ON
[6] Stream contínuo OFF
[7] Exigir palavra Yoru ON
[8] Exigir palavra Yoru OFF
[9] Sensibilidade 1 baixa / menos ruído
[10] Sensibilidade 3 normal
[11] Sensibilidade 5 alta / mais sensível
[12] Iniciar Chat Stream agora
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1': pip_install('requirements_stt.txt')
        elif c=='2': pip_install('requirements_ctrl_voice.txt')
        elif c=='3':
            from .voice.stream import StreamController
            print(StreamController(cfg, on_text=lambda x: None).diagnose())
        elif c=='4':
            stt=cfg.setdefault('stt', {}); stream=cfg.setdefault('stream', {})
            stt.update({'enabled': True, 'engine':'faster_whisper', 'model_size':'tiny', 'device':'cpu', 'compute_type':'int8', 'sample_rate':16000, 'language':'pt', 'beam_size':1, 'cpu_threads':2, 'num_workers':1, 'condition_on_previous_text': False, 'vad_filter': True, 'vad_min_silence_ms':350, 'vad_speech_pad_ms':120})
            stream.update({'enabled': True, 'mode':'ct2_fast', 'vad':'energy_adaptive', 'auto_calibrate': True, 'calibration_sec':1.2, 'noise_multiplier':3.2, 'energy_threshold':0.012, 'min_energy_threshold':0.008, 'max_energy_threshold':0.055, 'chunk_ms':30, 'prebuffer_ms':300, 'min_speech_ms':300, 'silence_end_ms':650, 'max_segment_sec':7, 'cooldown_after_tts_sec':1.0, 'require_wake_word':True, 'respond_to_questions':True, 'continuous_mode':False, 'min_transcript_chars':3})
            save_config(cfg); print('[OK] Configuração STREAM RÁPIDA CT2 aplicada.')
        elif c=='5': s['continuous_mode']=True; s['require_wake_word']=False; save_config(cfg); print('[OK] Stream contínuo ON.')
        elif c=='6': s['continuous_mode']=False; save_config(cfg); print('[OK] Stream contínuo OFF.')
        elif c=='7': s['require_wake_word']=True; save_config(cfg); print('[OK] Wake word ON.')
        elif c=='8': s['require_wake_word']=False; save_config(cfg); print('[OK] Wake word OFF.')
        elif c in {'9','10','11'}:
            level={'9':1,'10':3,'11':5}[c]
            thresholds={1:0.030,3:0.015,5:0.007}
            s['energy_threshold']=thresholds[level]; s['auto_calibrate']=False; save_config(cfg)
            print(f'[OK] Sensibilidade {level}. threshold={thresholds[level]:.3f}')
        elif c=='12': run_module('stream')
        elif c=='0': return

def set_brain_mode(mode: str):
    cfg = load_config()
    aliases = {'ambos':'auto','both':'auto','0.8b':'fast','08b':'fast','2b':'think','duplo':'dual'}
    mode = aliases.get(mode, mode)
    if mode not in {'auto','fast','think','dual'}:
        print('Modo inválido.')
        return
    cfg.setdefault('runtime', {})['brain_mode'] = mode
    save_config(cfg)
    print(f'[OK] brain_mode = {mode}')
    if mode == 'auto':
        print('AUTO/AMBOS: a Bridge usa FAST para leve e THINK para conhecimento/técnico/projeto.')
    elif mode == 'fast':
        print('FAST: força Qwen3.5 0.8B para quase tudo.')
    elif mode == 'think':
        print('THINK: força Qwen3.5 2B para quase tudo.')
    elif mode == 'dual':
        print('DUAL: FAST faz rascunho e THINK revisa. Mais lento, melhor para perguntas difíceis.')

def submenu_brains():
    while True:
        cfg = load_config()
        rt = cfg.get('runtime', {})
        print('''
=== Submenu Cérebros / Modo de Modelo ===
Modo atual: {mode}

[1] AUTO / AMBOS - roteamento entre FAST 0.8B e THINK 2B
[2] Só FAST - Qwen3.5 0.8B
[3] Só THINK - Qwen3.5 2B
[4] DUAL - FAST rascunha + THINK revisa
[5] Checar FAST/THINK
[6] Mostrar configuração dos modelos
[0] Voltar'''.format(mode=rt.get('brain_mode','auto')))
        c=input('Escolha: ').strip()
        if c=='1': set_brain_mode('auto')
        elif c=='2': set_brain_mode('fast')
        elif c=='3': set_brain_mode('think')
        elif c=='4': set_brain_mode('dual')
        elif c=='5': check_models()
        elif c=='6':
            cfg=load_config(); print('runtime=', cfg.get('runtime',{})); print('FAST=', cfg.get('models',{}).get('fast',{})); print('THINK=', cfg.get('models',{}).get('think',{}))
        elif c=='0': return


def set_fastbrain_preset(preset: str):
    cfg = load_config()
    profiles = cfg.get('model_profiles', {})
    if preset not in profiles:
        print('Preset não encontrado:', preset)
        return
    p = profiles[preset]
    f = cfg.setdefault('models', {}).setdefault('fast', {})
    f['label'] = p.get('label', f.get('label', 'Yoru FAST'))
    f['temperature'] = p.get('temperature', f.get('temperature', 0.24))
    f['max_tokens'] = p.get('max_tokens', f.get('max_tokens', 72))
    for k in ('top_p','top_k','min_p','repeat_penalty'):
        if k in p:
            f[k] = p[k]
    cfg.setdefault('model_paths', {})['fast_model_path'] = p.get('path', cfg.get('model_paths', {}).get('fast_model_path',''))
    cfg.setdefault('runtime', {})['fast_brain_preset'] = preset
    cfg.setdefault('runtime', {})['brain_mode'] = 'auto'
    save_config(cfg)
    print(f"[OK] FastBrain = {p.get('label')} | path={p.get('path')}")



def download_status():
    print(DownloadManager(load_config()).status_text())


def baixar_tudo():
    print(DownloadManager(load_config()).download_all())


def baixar_modelos():
    print(DownloadManager(load_config()).download_models())


def baixar_dependencias():
    print(DownloadManager(load_config()).install_deps())


def baixar_kobold():
    print(DownloadManager(load_config()).download_koboldcpp())


def abrir_pastas_downloads():
    print(DownloadManager(load_config()).open_folders())

def submenu_models():
    while True:
        print('''\n=== Submenu Modelos / KoboldCpp ===
[1] Checar FAST 5001 / THINK 5002
[2] Gerar .bat FAST/THINK
[3] Verificar se modelos/Kobold/deps já estão baixados
[4] BAIXAR TUDO recomendado (deps + KoboldCpp + FAST + THINK)
[5] Baixar só modelos FAST + THINK
[6] Baixar só dependências Python
[7] Baixar só KoboldCpp
[8] Abrir pastas dos downloads
[9] Abrir FAST models no navegador
[10] Abrir THINK models no navegador
[11] Aplicar Qwen3.5 2B como THINK 5002
[12] Voltar Qwen2.5 3B como THINK backup
[13] Mostrar caminhos dos modelos
[14] Cérebros: AUTO/AMBOS
[15] Cérebros: só FAST 0.8B
[16] Cérebros: só THINK 2B
[17] Cérebros: DUAL fast+think
[18] Aplicar FastBrain TURBO 0.8B
[19] Aplicar FastBrain PLUS 1.7B
[20] Aplicar FastBrain GEMMA 1B experimental
[0] Voltar''')
        c=input('Escolha: ').strip()
        if c=='1': check_models()
        elif c=='2': gen_bats()
        elif c=='3': download_status()
        elif c=='4': baixar_tudo(); gen_bats()
        elif c=='5': baixar_modelos(); gen_bats()
        elif c=='6': baixar_dependencias()
        elif c=='7': baixar_kobold(); gen_bats()
        elif c=='8': abrir_pastas_downloads()
        elif c=='9': webbrowser.open('http://127.0.0.1:5001/v1/models')
        elif c=='10': webbrowser.open('http://127.0.0.1:5002/v1/models')
        elif c=='11':
            subprocess.run([PYEXE, str(PACK_ROOT/'scripts'/'trocar_think_model.py'), 'qwen35_2b'], cwd=str(PACK_ROOT)); gen_bats()
        elif c=='12':
            subprocess.run([PYEXE, str(PACK_ROOT/'scripts'/'trocar_think_model.py'), 'qwen25_3b'], cwd=str(PACK_ROOT)); gen_bats()
        elif c=='13':
            cfg=load_config(); print('FAST:', cfg.get('model_paths',{}).get('fast_model_path')); print('THINK:', cfg.get('model_paths',{}).get('think_model_path')); print('BACKUP:', cfg.get('model_paths',{}).get('think_backup_qwen25_3b_path'))
        elif c=='14': set_brain_mode('auto')
        elif c=='15': set_brain_mode('fast')
        elif c=='16': set_brain_mode('think')
        elif c=='17': set_brain_mode('dual')
        elif c=='18': set_fastbrain_preset('fast_qwen35_08b_turbo'); gen_bats()
        elif c=='19': set_fastbrain_preset('fast_qwen3_17b_balanced'); gen_bats()
        elif c=='20': set_fastbrain_preset('fast_gemma3_1b_alt'); gen_bats()
        elif c=='0': return

def submenu_vault():
    from .storage.vault import VaultStore
    while True:
        print('''\n=== Submenu Vault / Obsidian ===
[1] Preparar/validar vault Yoru_ia
[2] Abrir vault
[3] Abrir config.json
[0] Voltar''')
        c=input('Escolha: ').strip()
        if c=='1':
            v=VaultStore(load_config()); v.ensure(); print('Vault preparado:', v.path)
        elif c=='2':
            p=Path(load_config().get('vault_path',''))
            if p.exists(): os.startfile(str(p))
            else: print('Vault não encontrado.')
        elif c=='3': open_config()
        elif c=='0': return


def apply_chat_focus():
    cfg = load_config()
    rt = cfg.setdefault('runtime', {})
    rt.update({
        'brain_mode': 'auto',
        'fallback_to_fast': False,
        'search_mode_enabled': False,
        'stream_model_output': True,
        'autospeed_enabled': False,
        'fast_history_turns': 0,
        'think_history_turns': 1,
        'history_turns': 1,
        'prompt_token_budget_chars': 1800,
    })
    cfg.setdefault('tts', {}).update({
        'enabled': True,
        'engine': 'edge',
        'speak_local': True,
        'speak_model': True,
        'speak_fast_model': True,
        'speak_think_model': True,
        'voice_persistence_mode': True,
        'strip_markdown_for_tts': True,
    })
    cfg['models']['think']['max_tokens'] = 190
    cfg['models']['think']['temperature'] = 0.25
    cfg['models']['fast']['max_tokens'] = 80
    cfg.setdefault('web_knowledge', {}).update({'enabled': True, 'auto_web_fallback': True, 'save_summaries_to_obsidian': True})
    save_config(cfg)
    print('[OK] Modo CHAT FOCO aplicado: AUTO FastBrain/THINK, voz persistente e Web Knowledge automático ligado.')

def submenu_chat_focus():
    while True:
        cfg = load_config()
        print(f'''
=== Submenu Chat Focus ===
Cérebro={cfg.get('runtime',{}).get('brain_mode')} | pesquisa={'ON' if cfg.get('runtime',{}).get('search_mode_enabled') else 'OFF'}

[1] Aplicar modo CHAT FOCO recomendado
[2] Ligar modo pesquisa persistente
[3] Desligar modo pesquisa persistente
[4] Forçar só THINK 2B sem fallback
[5] Voltar AUTO FAST/THINK
[6] Ligar voz persistente
[0] Voltar''')
        c=input('Escolha: ').strip()
        cfg = load_config()
        if c=='1': apply_chat_focus()
        elif c=='2':
            cfg.setdefault('runtime', {})['search_mode_enabled']=True; save_config(cfg); print('[OK] Modo pesquisa ON.')
        elif c=='3':
            cfg.setdefault('runtime', {})['search_mode_enabled']=False; save_config(cfg); print('[OK] Modo pesquisa OFF.')
        elif c=='4':
            cfg.setdefault('runtime', {})['brain_mode']='think'; cfg.setdefault('runtime', {})['fallback_to_fast']=False; save_config(cfg); print('[OK] Só THINK sem fallback.')
        elif c=='5':
            cfg.setdefault('runtime', {})['brain_mode']='auto'; cfg.setdefault('runtime', {})['fallback_to_fast']=True; save_config(cfg); print('[OK] AUTO FAST/THINK.')
        elif c=='6':
            t=cfg.setdefault('tts', {}); t.update({'enabled':True,'engine':'edge','speak_local':True,'speak_model':True,'speak_fast_model':True,'speak_think_model':True,'voice_persistence_mode':True,'strip_markdown_for_tts':True}); save_config(cfg); print('[OK] Voz persistente ON.')
        elif c=='0': return

def submenu_web_knowledge():
    from .skills.web_knowledge import WebKnowledge
    while True:
        cfg = load_config()
        wk = cfg.get('web_knowledge', {})
        print(f"""
=== Submenu Web Knowledge / Pesquisa Automática ===
Web: {'ON' if wk.get('enabled', True) else 'OFF'} | auto={'ON' if wk.get('auto_web_fallback', True) else 'OFF'} | salvar Obsidian={'ON' if wk.get('save_summaries_to_obsidian', True) else 'OFF'}

[1] Ligar Web Knowledge automático
[2] Desligar Web Knowledge automático
[3] Ligar modo pesquisa persistente
[4] Desligar modo pesquisa persistente
[5] Limpar cache web
[6] Mostrar config web
[7] Abrir cache web
[8] Aplicar configuração recomendada
[0] Voltar""")
        c=input('Escolha: ').strip()
        cfg = load_config()
        if c=='1':
            cfg.setdefault('web_knowledge', {})['enabled']=True
            cfg.setdefault('web_knowledge', {})['auto_web_fallback']=True
            save_config(cfg); print('[OK] Web Knowledge automático ON.')
        elif c=='2':
            cfg.setdefault('web_knowledge', {})['auto_web_fallback']=False
            save_config(cfg); print('[OK] Web Knowledge automático OFF. /web pergunta ainda pode ser usado.')
        elif c=='3':
            cfg.setdefault('runtime', {})['search_mode_enabled']=True
            save_config(cfg); print('[OK] Modo pesquisa persistente ON.')
        elif c=='4':
            cfg.setdefault('runtime', {})['search_mode_enabled']=False
            save_config(cfg); print('[OK] Modo pesquisa persistente OFF.')
        elif c=='5':
            w=WebKnowledge(cfg)
            print(f'[OK] Cache limpo: {w.clear_cache()} item(ns).')
        elif c=='6':
            print('web_knowledge=', cfg.get('web_knowledge', {}))
            print('runtime.search_mode_enabled=', cfg.get('runtime',{}).get('search_mode_enabled'))
        elif c=='7':
            f = PACK_ROOT / cfg.get('web_knowledge',{}).get('cache_file','data/web_knowledge_cache.json')
            if f.exists(): os.startfile(str(f))
            else: print('Cache não encontrado:', f)
        elif c=='8':
            cfg.setdefault('web_knowledge', {}).update({'enabled': True, 'auto_web_fallback': True, 'save_summaries_to_obsidian': True, 'cache_ttl_sec': 21600, 'max_results': 5})
            cfg.setdefault('runtime', {})['brain_mode']='think'
            cfg.setdefault('runtime', {})['fallback_to_fast']=False
            save_config(cfg); print('[OK] Recomendado aplicado: THINK + web automático + sem fallback ruim para FAST.')
        elif c=='0': return

def submenu_speed():
    while True:
        print("""
=== Submenu Velocidade / FastLane ===
[1] Aplicar modo TURBO EXTREMO
[2] Aplicar modo NORMAL
[3] Mostrar config de velocidade
[4] Reduzir tokens FAST/THINK
[5] Aumentar um pouco tokens FAST/THINK
[6] Ligar saída incremental do modelo
[7] Desligar saída incremental do modelo
[8] Ligar cache de respostas
[9] Desligar cache de respostas
[10] Não falar respostas do FAST no TTS
[11] Falar respostas do FAST no TTS
[12] Aplicar voz persistente
[0] Voltar""")
        c=input('Escolha: ').strip()
        cfg=load_config()
        if c=='1':
            rt=cfg.setdefault('runtime', {})
            rt.update({'speed_mode':'turbo','fast_history_turns':0,'think_history_turns':1,'history_turns':1,'skip_memory_for_fast':True,'prompt_token_budget_chars':1600,'stream_model_output':True,'response_cache_enabled':True})
            cfg.setdefault('memory', {})['max_chars_per_file']=360
            cfg.setdefault('memory', {})['cache_ttl_sec']=90
            cfg['models']['fast']['max_tokens']=72
            cfg['models']['fast']['temperature']=0.24
            cfg['models']['fast']['top_p']=0.88
            cfg['models']['fast']['repeat_penalty']=1.08
            cfg['models']['think']['max_tokens']=140
            save_config(cfg); print('[OK] Turbo extremo aplicado.')
        elif c=='2':
            rt=cfg.setdefault('runtime', {})
            rt.update({'speed_mode':'normal','fast_history_turns':1,'think_history_turns':2,'history_turns':2,'skip_memory_for_fast':False,'prompt_token_budget_chars':3600,'stream_model_output':True,'response_cache_enabled':True})
            cfg.setdefault('memory', {})['max_chars_per_file']=900
            cfg.setdefault('memory', {})['cache_ttl_sec']=30
            cfg['models']['fast']['max_tokens']=110
            cfg['models']['think']['max_tokens']=240
            save_config(cfg); print('[OK] Normal aplicado.')
        elif c=='3':
            print('runtime=', cfg.get('runtime', {}))
            print('memory=', cfg.get('memory', {}))
            print('tts=', cfg.get('tts', {}))
            print('fast=', cfg.get('models',{}).get('fast',{}))
            print('think=', cfg.get('models',{}).get('think',{}))
        elif c=='4':
            cfg['models']['fast']['max_tokens']=60
            cfg['models']['think']['max_tokens']=120
            save_config(cfg); print('[OK] Tokens reduzidos.')
        elif c=='5':
            cfg['models']['fast']['max_tokens']=120
            cfg['models']['think']['max_tokens']=220
            save_config(cfg); print('[OK] Tokens aumentados moderadamente.')
        elif c=='6':
            cfg.setdefault('runtime', {})['stream_model_output']=True; save_config(cfg); print('[OK] Stream incremental ligado.')
        elif c=='7':
            cfg.setdefault('runtime', {})['stream_model_output']=False; save_config(cfg); print('[OK] Stream incremental desligado.')
        elif c=='8':
            cfg.setdefault('runtime', {})['response_cache_enabled']=True; save_config(cfg); print('[OK] Cache de respostas ligado.')
        elif c=='9':
            cfg.setdefault('runtime', {})['response_cache_enabled']=False; save_config(cfg); print('[OK] Cache de respostas desligado.')
        elif c=='10':
            cfg.setdefault('tts', {})['speak_fast_model']=False; save_config(cfg); print('[OK] TTS não vai falar respostas do FAST.')
        elif c=='11':
            cfg.setdefault('tts', {})['speak_fast_model']=True; save_config(cfg); print('[OK] TTS vai falar respostas do FAST.')
        elif c=='12':
            t=cfg.setdefault('tts', {})
            t.update({'enabled': True, 'speak_local': True, 'speak_model': True, 'speak_fast_model': True, 'speak_think_model': True, 'voice_persistence_mode': True, 'audio_cache_enabled': False, 'drop_old_when_queue_full': False, 'max_queue': 6})
            save_config(cfg); print('[OK] Voz persistente aplicada no modo velocidade.')
        elif c=='0': return


def diagnostico_geral():
    """Mostra um diagnóstico em ordem de execução, sem iniciar o chat."""
    cfg = load_config()
    print('\n=== Diagnóstico Geral / Ordem de Execução ===')
    print('1) Config:', PACK_ROOT / 'config.json')
    print('   version:', cfg.get('version'))
    print('2) Vault:', cfg.get('vault_path'))
    try:
        from .storage.vault import VaultStore
        v = VaultStore(cfg)
        print('   vault_ok:', v.path.exists(), '| path:', v.path)
    except Exception as e:
        print('   vault_erro:', e)
    print('3) Modelos:')
    try:
        check_models()
    except Exception as e:
        print('   erro ao checar modelos:', e)
    print('4) Cérebro:', cfg.get('runtime', {}).get('brain_mode', 'auto'))
    print('5) TTS:', cfg.get('tts', {}))
    print('6) STT:', cfg.get('stt', {}))
    print('7) Stream:', cfg.get('stream', {}))
    print('8) Web Knowledge:', cfg.get('web_knowledge', {}))
    print('9) App Inventory:', cfg.get('apps', {}))
    print('===========================================')


def reparar_config():
    cfg = load_config(repair=True)
    save_config(cfg)
    print('[OK] config.json carregado/reparado com padrões atuais.')
    print('Config:', PACK_ROOT / 'config.json')


def aplicar_setup_recomendado():
    cfg = load_config()
    cfg.setdefault('runtime', {}).update({
        'brain_mode': 'auto',
        'fallback_to_fast': False,
        'stream_model_output': True,
        'history_turns': 1,
        'think_history_turns': 1,
        'fast_history_turns': 0,
        'prompt_token_budget_chars': 1600,
        'response_cache_enabled': True,
    })
    cfg.setdefault('web_knowledge', {}).update({
        'enabled': True,
        'auto_web_fallback': True,
        'save_summaries_to_obsidian': True,
        'cache_ttl_sec': 21600,
        'max_results': 5,
    })
    cfg.setdefault('tts', {}).update({
        'enabled': True,
        'engine': 'edge',
        'edge_voice': 'pt-BR-FranciscaNeural',
        'speak_local': True,
        'speak_model': True,
        'speak_fast_model': True,
        'speak_think_model': True,
        'voice_persistence_mode': True,
        'strip_markdown_for_tts': True,
        'audio_cache_enabled': False,
    })
    save_config(cfg)
    print('[OK] Setup recomendado aplicado: AUTO FastBrain/THINK, Web Knowledge ON e voz limpa.')


def aplicar_stream_rapido_ct2():
    cfg = load_config()
    stt=cfg.setdefault('stt', {})
    stream=cfg.setdefault('stream', {})
    stt.update({'enabled': True, 'engine':'faster_whisper', 'model_size':'tiny', 'device':'cpu', 'compute_type':'int8', 'sample_rate':16000, 'language':'pt', 'beam_size':1, 'cpu_threads':2, 'num_workers':1, 'condition_on_previous_text': False, 'vad_filter': True, 'vad_min_silence_ms':350, 'vad_speech_pad_ms':120})
    stream.update({'enabled': True, 'mode':'ct2_fast', 'vad':'energy_adaptive', 'auto_calibrate': True, 'calibration_sec':1.2, 'noise_multiplier':3.2, 'energy_threshold':0.012, 'min_energy_threshold':0.008, 'max_energy_threshold':0.055, 'chunk_ms':30, 'prebuffer_ms':300, 'min_speech_ms':300, 'silence_end_ms':650, 'max_segment_sec':7, 'cooldown_after_tts_sec':1.0, 'require_wake_word':True, 'respond_to_questions':True, 'continuous_mode':False, 'min_transcript_chars':3})
    save_config(cfg)
    print('[OK] Stream rápido CT2 aplicado: tiny/int8/cpu + VAD adaptativo + wake word Yoru.')


def submenu_primeira_execucao():
    while True:
        print("""\n=== PASSO 1 - Preparar Ambiente / Primeira Execução ===
Use este menu antes de iniciar a Yoru em uma pasta nova.

[1] Validar/compilar Python
[2] Criar/reparar config.json
[3] Preparar/validar vault Yoru_ia
[4] Gerar .bat Kobold FAST/THINK
[5] Checar FAST 5001 / THINK 5002
[6] Verificar downloads/modelos/dependências
[7] BAIXAR TUDO recomendado
[8] Instalar/atualizar Edge TTS
[9] Instalar/atualizar Faster-Whisper + sounddevice
[10] Aplicar setup recomendado de Chat
[11] Aplicar setup Stream rápido CT2
[12] Diagnóstico geral
[13] Abrir config.json
[14] Escanear programas do PC
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1': validate()
        elif c=='2': reparar_config()
        elif c=='3':
            from .storage.vault import VaultStore
            v=VaultStore(load_config()); v.ensure(); print('[OK] Vault preparado:', v.path)
        elif c=='4': gen_bats()
        elif c=='5': check_models()
        elif c=='6': download_status()
        elif c=='7': baixar_tudo(); gen_bats()
        elif c=='8': pip_install('requirements_tts_edge.txt')
        elif c=='9': pip_install('requirements_stt.txt')
        elif c=='10': aplicar_setup_recomendado()
        elif c=='11': aplicar_stream_rapido_ct2()
        elif c=='12': diagnostico_geral()
        elif c=='13': open_config()
        elif c=='14':
            from .skills.apps import AppInventorySkill
            print(AppInventorySkill(load_config()).scan_and_save())
        elif c=='0': return


def submenu_sites():
    while True:
        print("""\n=== Extras - Sites / Navegador ===
Os comandos de sites são usados dentro do Chat.
Exemplos:
  abra youtube
  abra youtube e pesquise anime
  pesquisa gatos no youtube
  /sites
  /site add nome https://site.com

[1] Abrir custom_sites.json
[2] Mostrar caminho do arquivo de sites
[3] Abrir config.json
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1':
            cfg=load_config(); f=PACK_ROOT / cfg.get('browser',{}).get('safe_sites_file','data/custom_sites.json')
            if f.exists(): os.startfile(str(f))
            else: print('Arquivo não encontrado:', f)
        elif c=='2':
            cfg=load_config(); print(PACK_ROOT / cfg.get('browser',{}).get('safe_sites_file','data/custom_sites.json'))
        elif c=='3': open_config()
        elif c=='0': return


def submenu_apps_inventory():
    from .skills.apps import AppInventorySkill
    while True:
        cfg = load_config()
        skill = AppInventorySkill(cfg)
        print(f"""\n=== Extras - Programas do PC / App Inventory ===
{skill.status()}

[1] Escanear/atualizar programas agora
[2] Listar programas abríveis
[3] Buscar programa
[4] Abrir programa pelo nome
[5] Abrir arquivo data/apps_inventory.json
[6] Ligar App Inventory
[7] Desligar App Inventory
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1': print(skill.scan_and_save())
        elif c=='2': print(skill.list_apps(limit=80))
        elif c=='3':
            q=input('Nome para buscar: ').strip()
            if q: print(skill.search_text(q))
        elif c=='4':
            q=input('Nome para abrir: ').strip()
            if q: print(skill.launch(q))
        elif c=='5':
            if skill.db_file.exists(): os.startfile(str(skill.db_file))
            else: print('Arquivo ainda não existe. Use a opção 1 primeiro.')
        elif c=='6':
            cfg.setdefault('apps', {})['enabled']=True; save_config(cfg); print('[OK] App Inventory ON.')
        elif c=='7':
            cfg.setdefault('apps', {})['enabled']=False; save_config(cfg); print('[OK] App Inventory OFF.')
        elif c=='0': return



def submenu_download_center():
    while True:
        print("""\n=== Download Center / Baixar Tudo ===
[1] Verificar se já está baixado
[2] BAIXAR TUDO recomendado (deps + KoboldCpp + FAST + THINK)
[3] Baixar só modelos FAST + THINK
[4] Baixar só dependências Python
[5] Baixar só KoboldCpp
[6] Abrir pastas C:\\IA_MODELOS e C:\\KoboldCpp
[7] Gerar BATs FAST/THINK
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1': download_status()
        elif c=='2': baixar_tudo(); gen_bats()
        elif c=='3': baixar_modelos(); gen_bats()
        elif c=='4': baixar_dependencias()
        elif c=='5': baixar_kobold(); gen_bats()
        elif c=='6': abrir_pastas_downloads()
        elif c=='7': gen_bats()
        elif c=='0': return

def submenu_manutencao():
    while True:
        print("""\n=== Diagnóstico / Manutenção ===
[1] Diagnóstico geral
[2] Checar FAST/THINK
[3] Validar/compilar Python
[4] Abrir config.json
[5] Reparar config.json
[6] Abrir pasta do pack
[7] Verificar downloads/modelos/dependências
[8] BAIXAR TUDO recomendado
[0] Voltar""")
        c=input('Escolha: ').strip()
        if c=='1': diagnostico_geral()
        elif c=='2': check_models()
        elif c=='3': validate()
        elif c=='4': open_config()
        elif c=='5': reparar_config()
        elif c=='6': os.startfile(str(PACK_ROOT))
        elif c=='7': download_status()
        elif c=='8': baixar_tudo(); gen_bats()
        elif c=='0': return


def iniciar_chat_texto():
    run_module('text')

def iniciar_chat_voz():
    run_module('voice')

def iniciar_chat_stream():
    run_module('stream')


def main():
    while True:
        print("""\n===============================================================
 Yoru Bridge Modern 1.8.39 - BrowserIntentPlus - 2026
===============================================================
ORDEM RECOMENDADA:
  1) Preparar ambiente  2) Modelos  3) Cérebro  4) Chat
  5) Voz/Stream         6) Web       7) Apps/Avatar/Velocidade

[1] PASSO 1 - Preparar ambiente / primeira execução
[2] PASSO 2 - Modelos / KoboldCpp FAST-THINK
[3] PASSO 3 - Cérebros / modo FAST-THINK
[4] PASSO 4 - Chat Texto
[5] PASSO 5 - Voz / TTS + STT
[6] PASSO 6 - Chat de Voz
[7] PASSO 7 - Chat Stream ao vivo CT2
[8] PASSO 8 - Web Knowledge / Pesquisa automática
[9] PASSO 9 - Velocidade / FastLane
[10] PASSO 10 - Programas do PC / App Inventory
[11] Extras - Avatar Bridge / Eventos
[12] Extras - Vault / Obsidian
[13] Extras - Sites / Navegador
[14] Diagnóstico / Manutenção
[15] Abrir config.json
[16] Download Center - baixar/verificar tudo
[0] Sair""")
        try:
            c=input('Escolha: ').strip()
        except KeyboardInterrupt:
            print('\nSaindo do menu.')
            return
        if c=='1': submenu_primeira_execucao()
        elif c=='2': submenu_models()
        elif c=='3': submenu_brains()
        elif c=='4': iniciar_chat_texto()
        elif c=='5': submenu_voice()
        elif c=='6': iniciar_chat_voz()
        elif c=='7': iniciar_chat_stream()
        elif c=='8': submenu_web_knowledge()
        elif c=='9': submenu_speed()
        elif c=='10': submenu_apps_inventory()
        elif c=='11': print('Use no Chat Texto: /avatar status, /avatar teste, /avatar eventos, /avatar emote happy, /avatar state thinking, /avatar dizer texto')
        elif c=='12': submenu_vault()
        elif c=='13': submenu_sites()
        elif c=='14': submenu_manutencao()
        elif c=='15': open_config()
        elif c=='16': submenu_download_center()
        elif c=='0': return

if __name__ == '__main__':
    main()
