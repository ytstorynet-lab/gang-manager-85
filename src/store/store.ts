/**
 * The game talks to whichever store sold it through this one interface, so the rest of
 * the code never needs to know whether it's running from Steam, Epic, the Microsoft Store
 * or a DRM-free copy. Each store gets its own adapter; tests use FakeStore.
 */
export type StoreName = 'steam' | 'epic' | 'microsoft' | 'drm-free' | 'fake';

export interface StoreAdapter {
  readonly name: StoreName;
  /** Whether the player owns the given expansion. */
  ownsExpansion(expansionId: string): boolean;
}
