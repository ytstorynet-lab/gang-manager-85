/**
 * Plays 1,000 collections for each mix of crew quality and approach, and prints how
 * they went. Use it to judge the balance: better crews should do better, and going loud
 * should pay more but draw more heat. A second table shows what the boss's calls change.
 *
 *   npm run sim:batch
 *   npm run sim:batch -- --jobs 5000
 */
import { parseArgs } from 'node:util';
import { formatMoney } from '../src/report/collection-report';
import {
  ROLES,
  generateCrew,
  playCollection,
  type Approach,
  type Beat,
  type Call,
  type CollectionResult,
  type Outcome,
} from '../src/sim/jobs/collection';
import { createRng, type Rng } from '../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../src/sim/world';

const { values } = parseArgs({ options: { jobs: { type: 'string', default: '1000' } } });
const jobs = Number(values.jobs);

/** Decides the boss's call for each beat. Returning nothing lets the crew carry on. */
type Caller = (beat: Beat) => Call | undefined;

const QUALITIES = [
  { label: 'Poor (6)', quality: 6 },
  { label: 'Average (10)', quality: 10 },
  { label: 'Good (14)', quality: 14 },
] as const;
const APPROACHES: readonly Approach[] = ['quiet', 'loud'];
const OUTCOMES: readonly Outcome[] = ['clean', 'messy', 'botched', 'busted', 'calledOff'];

const STRATEGIES: readonly { label: string; caller: () => Caller }[] = [
  { label: 'No calls', caller: () => () => undefined },
  {
    label: 'Lie low when you can',
    caller: () => (beat) => (beat.calls.includes('lieLow') ? 'lieLow' : undefined),
  },
  {
    label: 'Go loud if the owner stalls',
    caller: () => (beat) =>
      beat.entry.key === 'collection.quiet.stalls' && beat.calls.includes('goLoud')
        ? 'goLoud'
        : undefined,
  },
  {
    label: 'Pull out if noticed',
    caller: () => (beat) =>
      beat.entry.key === 'collection.patrol.noticed' ? 'pullOut' : undefined,
  },
];

function playOne(rng: Rng, quality: number, approach: Approach, caller: Caller): CollectionResult {
  const play = playCollection(
    {
      crew: generateCrew(rng, quality),
      approach,
      business: rng.pick(BEACH_STRIP_BUSINESSES),
      district: BEACH_STRIP,
    },
    rng,
  );
  let step = play.next();
  while (!step.done) {
    step = play.next(caller(step.value));
  }
  return step.value;
}

function summarise(results: readonly CollectionResult[]): string[] {
  const counts = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    Outcome,
    number
  >;
  let money = 0;
  let heat = 0;
  let rating = 0;
  for (const result of results) {
    counts[result.outcome]++;
    money += result.money;
    heat += result.heat;
    rating += ROLES.reduce((sum, role) => sum + result.ratings[role], 0) / ROLES.length;
  }
  const n = results.length;
  return [
    ...OUTCOMES.map((outcome) => `${((counts[outcome] / n) * 100).toFixed(1)}%`.padStart(10)),
    formatMoney(money / n).padStart(8),
    (heat / n).toFixed(1).padStart(6),
    (rating / n).toFixed(1).padStart(7),
  ];
}

function header(first: string, firstWidth: number, second?: string): string {
  return [
    first.padEnd(firstWidth),
    ...(second ? [second.padEnd(9)] : []),
    ...OUTCOMES.map((outcome) => outcome.padStart(10)),
    'Money'.padStart(8),
    'Heat'.padStart(6),
    'Rating'.padStart(7),
  ].join('');
}

console.log('');
console.log(`${jobs.toLocaleString('en-US')} collections for each row, on the beach strip`);
console.log('');
const top = header('Crew', 14, 'Approach');
console.log(top);
console.log('-'.repeat(top.length));
for (const { label, quality } of QUALITIES) {
  for (const approach of APPROACHES) {
    const rng = createRng(`batch:${quality}:${approach}`);
    const results = Array.from({ length: jobs }, () =>
      playOne(rng, quality, approach, () => undefined),
    );
    console.log([label.padEnd(14), approach.padEnd(9), ...summarise(results)].join(''));
  }
}

console.log('');
console.log('What the calls change, for average crews on quiet jobs');
console.log('');
const bottom = header('Calls', 30);
console.log(bottom);
console.log('-'.repeat(bottom.length));
for (const { label, caller } of STRATEGIES) {
  // Every strategy plays the same jobs, so the differences come from the calls alone.
  const results = Array.from({ length: jobs * 4 }, (_, index) =>
    playOne(createRng(`batch:calls:${index}`), 10, 'quiet', caller()),
  );
  console.log([label.padEnd(30), ...summarise(results)].join(''));
}

console.log('');
console.log('Money, heat and rating are averages per job.');
console.log('');
