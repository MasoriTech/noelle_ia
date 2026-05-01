
def detect_gpu():
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except:
        pass
    return "cpu"

if __name__ == "__main__":
    print(detect_gpu())
