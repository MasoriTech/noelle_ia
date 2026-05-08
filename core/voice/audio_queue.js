class AudioQueue {
  constructor() {
    this.queue = [];
    this.busy = false;
  }

  push(item) {
    this.queue.push(item);
  }

  clear() {
    this.queue = [];
    this.busy = false;
  }
}

module.exports = { AudioQueue };
