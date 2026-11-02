import type { StoreAdapter } from './store';

/**
 * A pretend store for tests and the browser build. It owns exactly the expansions it's
 * given, so every expansion can be tested both owned and not owned.
 */
export class FakeStore implements StoreAdapter {
  readonly name = 'fake';
  readonly #owned: ReadonlySet<string>;

  constructor(ownedExpansions: Iterable<string> = []) {
    this.#owned = new Set(ownedExpansions);
  }

  ownsExpansion(expansionId: string): boolean {
    return this.#owned.has(expansionId);
  }
}
