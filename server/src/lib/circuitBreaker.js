/**
 * Minimal circuit breaker.
 *
 *  closed    - normal operation; consecutive failures are counted.
 *  open      - after `failureThreshold` failures we fail fast for `cooldownMs` instead of
 *              making every user wait for a timeout while the upstream is down.
 *  half-open - after the cooldown ONE probe request is let through; success closes the circuit,
 *              failure re-opens it.
 */
export class CircuitBreaker {
  #state = 'closed';
  #failures = 0;
  #openedAt = 0;
  #probeInFlight = false;
  #threshold;
  #cooldownMs;
  #now;

  constructor({ failureThreshold = 5, cooldownMs = 15_000, now = Date.now } = {}) {
    this.#threshold = failureThreshold;
    this.#cooldownMs = cooldownMs;
    this.#now = now;
  }

  get state() {
    return this.#state;
  }

  canRequest() {
    if (this.#state === 'closed') return true;
    if (this.#state === 'open' && this.#now() - this.#openedAt >= this.#cooldownMs) {
      this.#state = 'half-open';
    }
    if (this.#state === 'half-open' && !this.#probeInFlight) {
      this.#probeInFlight = true;
      return true;
    }
    return false;
  }

  onSuccess() {
    this.#state = 'closed';
    this.#failures = 0;
    this.#probeInFlight = false;
  }

  onFailure() {
    this.#probeInFlight = false;
    this.#failures += 1;
    if (this.#state === 'half-open' || this.#failures >= this.#threshold) {
      this.#state = 'open';
      this.#openedAt = this.#now();
    }
  }

  /** The upstream answered but the answer says nothing about its health (e.g. a 404). */
  onNeutral() {
    this.#probeInFlight = false;
    if (this.#state === 'half-open') this.#state = 'closed';
  }
}
