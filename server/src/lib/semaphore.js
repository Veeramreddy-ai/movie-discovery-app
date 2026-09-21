/** Limits how many async tasks run at once; the rest wait in a FIFO queue. */
export class Semaphore {
  #max;
  #active = 0;
  #queue = [];

  constructor(max) {
    this.#max = Math.max(1, max);
  }

  async run(task) {
    if (this.#active >= this.#max) {
      await new Promise((resolve) => this.#queue.push(resolve));
    }
    this.#active += 1;
    try {
      return await task();
    } finally {
      this.#active -= 1;
      this.#queue.shift()?.();
    }
  }
}
