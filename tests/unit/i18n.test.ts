import { afterEach, describe, expect, it } from 'vitest';
import { availableLanguages, setLanguage, t } from '../../src/i18n';
import { en } from '../../src/i18n/en';

const placeholdersIn = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort();

describe('game text', () => {
  afterEach(() => setLanguage('en'));

  it('has English text for every key', () => {
    for (const [key, text] of Object.entries(en)) {
      expect(text.trim(), key).not.toBe('');
    }
  });

  it('fills in placeholders', () => {
    expect(t('build.version', { version: '0.1.0' })).toBe('Version 0.1.0');
  });

  it('leaves a placeholder visible when its value is missing', () => {
    expect(t('build.version')).toBe('Version {version}');
  });

  it('refuses a language it has no text for', () => {
    expect(() => setLanguage('xx')).toThrow('No text for language "xx"');
  });

  it('keeps the same placeholders in every language', () => {
    for (const code of availableLanguages()) {
      setLanguage(code);
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholdersIn(t(key)), `${code}: ${key}`).toEqual(placeholdersIn(en[key]));
      }
    }
  });
});
