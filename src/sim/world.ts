import type { MessageKey } from '../i18n/en';

export interface District {
  readonly id: string;
  readonly nameKey: MessageKey;
  /** Chance a patrol car comes past during a job, 0 to 1. */
  readonly patrol: number;
  /** Chance rivals are out on the streets during a job, 0 to 1. */
  readonly rivals: number;
}

/** A business that pays for protection. Names are invented. */
export interface Business {
  /** A short name for the code and the art. Never shown to the player. */
  readonly id: string;
  readonly name: string;
  /** How hard the owner pushes back, 1 to 20. */
  readonly resolve: number;
  /** The usual weekly payment, in dollars. */
  readonly envelope: number;
  /** How tough the doorman is, 1 to 20, or 0 if there isn't one. */
  readonly doorman: number;
}

export const BEACH_STRIP: District = {
  id: 'beach-strip',
  nameKey: 'district.beachStrip',
  patrol: 0.35,
  rivals: 0.25,
};

export const BEACH_STRIP_BUSINESSES: readonly Business[] = [
  { id: 'starlight', name: 'Starlight Lounge', resolve: 12, envelope: 1800, doorman: 11 },
  { id: 'coral-wash', name: 'Coral Wash Laundromat', resolve: 7, envelope: 600, doorman: 0 },
  { id: 'neptune', name: 'Neptune Video', resolve: 9, envelope: 700, doorman: 0 },
  { id: 'sunny-side', name: 'Sunny Side Diner', resolve: 8, envelope: 900, doorman: 0 },
  { id: 'palm-court', name: 'Palm Court Motel', resolve: 11, envelope: 1200, doorman: 8 },
  { id: 'lucky-seven', name: 'Lucky Seven Arcade', resolve: 14, envelope: 1400, doorman: 12 },
  { id: 'flamingo', name: 'Flamingo Car Wash', resolve: 10, envelope: 1000, doorman: 6 },
];
