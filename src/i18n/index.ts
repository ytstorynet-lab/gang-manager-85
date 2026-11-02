import { en, type MessageKey } from './en';

export type { MessageKey };

/** A complete set of the game's text in one language. */
export type Messages = Readonly<Record<MessageKey, string>>;

const languages: Readonly<Record<string, Messages>> = { en };

let current: Messages = en;

/** The language codes the game has text for. */
export function availableLanguages(): string[] {
  return Object.keys(languages);
}

/** Switches every later `t()` call to another language. */
export function setLanguage(code: string): void {
  const messages = languages[code];
  if (!messages) {
    throw new Error(`No text for language "${code}"`);
  }
  current = messages;
}

/**
 * Looks up a piece of text and fills in its {placeholders}.
 * A placeholder with no value is left as it is, so a missing value is easy to spot.
 */
export function t(key: MessageKey, params: Readonly<Record<string, string | number>> = {}): string {
  return current[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
