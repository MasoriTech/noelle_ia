
import torch

def has_gpu():
    return torch.cuda.is_available()

if __name__ == "__main__":
    print("GPU:", has_gpu())
