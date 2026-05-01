
import queue
import threading

task_queue = queue.Queue()

def worker():
    while True:
        item = task_queue.get()
        if item is None:
            break
        print("[queue] processing:", item)
        task_queue.task_done()

thread = threading.Thread(target=worker, daemon=True)
thread.start()

def enqueue(item):
    task_queue.put(item)
