/**
 * Plays 1,000 collections for each mix of crew quality and approach, and prints how
 * they went. Use it to judge the balance: better crews should do better, and going loud
 * should pay more but draw more heat.
 *
 *   npm run sim:batch
 *   npm run sim:batch -- --jobs 5000
 */
import { parseArgs } from 'node:util';
import { formatMoney } from '../src/report/collection-report';
import {
  ROLES,
  generateCrew,
  runCollection,
  type Approach,
  type Outcome,
} from '../src/sim/jobs/collection';
import { createRng } from '../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../src/sim/world';

const { values } = parseArgs({ options: { jobs: { type: 'string', default: '1000' } } });
const jobs = Number(values.jobs);

const QUALITIES = [
  { label: 'Poor (6)', quality: 6 },
  { label: 'Average (10)', quality: 10 },
  { label: 'Good (14)', quality: 14 },
] as const;
const APPROACHES: readonly Approach[] = ['quiet', 'loud'];
const OUTCOMES: readonly Outcome[] = ['clean', 'messy', 'botched', 'busted'];

const header = [
  'Crew'.padEnd(14),
  'Approach'.padEnd(9),
  ...OUTCOMES.map((outcome) => outcome.padStart(8)),
  'Money'.padStart(8),
  'Heat'.padStart(6),
  'Rating'.padStart(7),
  'Skimmed'.padStart(8),
].join('');

console.log('');
console.log(`${jobs.toLocaleString('en-US')} collections for each row, on the beach strip`);
console.log('');
console.log(header);
console.log('-'.repeat(header.length));

for (const { label, quality } of QUALITIES) {
  for (const approach of APPROACHES) {
    const rng = createRng(`batch:${quality}:${approach}`);
    const counts: Record<Outcome, number> = { clean: 0, messy: 0, botched: 0, busted: 0 };
    let money = 0;
    let heat = 0;
    let rating = 0;
    let skimmed = 0;
    for (let i = 0; i < jobs; i++) {
      const result = runCollection(
        {
          crew: generateCrew(rng, quality),
          approach,
          business: rng.pick(BEACH_STRIP_BUSINESSES),
          district: BEACH_STRIP,
        },
        rng,
      );
      counts[result.outcome]++;
      money += result.money;
      heat += result.heat;
      skimmed += result.skimmed;
      rating += ROLES.reduce((sum, role) => sum + result.ratings[role], 0) / ROLES.length;
    }
    console.log(
      [
        label.padEnd(14),
        approach.padEnd(9),
        ...OUTCOMES.map((outcome) => `${((counts[outcome] / jobs) * 100).toFixed(1)}%`.padStart(8)),
        formatMoney(money / jobs).padStart(8),
        (heat / jobs).toFixed(1).padStart(6),
        (rating / jobs).toFixed(1).padStart(7),
        formatMoney(skimmed / jobs).padStart(8),
      ].join(''),
    );
  }
}
console.log('');
console.log(
  'Money, heat, rating and skimmed are averages per job. Skimmed is hidden from players.',
);
console.log('');
