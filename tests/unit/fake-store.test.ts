import { describe, expect, it } from 'vitest';
import { FakeStore } from '../../src/store/fake-store';

describe('fake store', () => {
  it('owns only the expansions it was given', () => {
    const store = new FakeStore(['new-city']);
    expect(store.ownsExpansion('new-city')).toBe(true);
    expect(store.ownsExpansion('new-decade')).toBe(false);
  });

  it('owns nothing by default', () => {
    expect(new FakeStore().ownsExpansion('new-city')).toBe(false);
  });
});
