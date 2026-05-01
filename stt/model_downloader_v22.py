
import os

def download_model(model):
    print(f"[model-downloader] downloading model: {model}")
    os.makedirs("models/whisper", exist_ok=True)
    open(f"models/whisper/{model}.installed","w").write("ok")
