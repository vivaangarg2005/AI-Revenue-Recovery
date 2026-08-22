/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator.
 * Guarantees 100% reproducible random sequences given the same seed.
 */
export class PseudoRandom {
  private state: number;

  constructor(seed: number = 20260822) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a float between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer between min (inclusive) and max (inclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from an array.
   */
  public pick<T>(array: T[]): T {
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }
}
