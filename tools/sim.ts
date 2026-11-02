/**
 * Plays one collection and prints it as a timed play-by-play.
 *
 *   npm run sim
 *   npm run sim -- --seed 1985 --approach loud --quality 14
 *
 * --seed      any text; the same seed always plays out the same way (default: random)
 * --approach  quiet or loud (default: picked by the seed)
 * --quality   the crew's average skill, 1 to 20 (default: picked by the seed, 6 to 14)
 */
import { parseArgs } from 'node:util';
import { renderCollection } from '../src/report/collection-report';
import {
  generateCrew,
  runCollection,
  type Approach,
  type CollectionPlan,
} from '../src/sim/jobs/collection';
import { createRng } from '../src/sim/rng';
import { BEACH_STRIP, BEACH_STRIP_BUSINESSES } from '../src/sim/world';

const { values } = parseArgs({
  options: {
    seed: { type: 'string' },
    approach: { type: 'string' },
    quality: { type: 'string' },
  },
});

const seed = values.seed ?? String(Date.now());
if (values.approach && values.approach !== 'quiet' && values.approach !== 'loud') {
  throw new Error('--approach must be quiet or loud');
}

const rng = createRng(seed);
const quality = values.quality ? Number(values.quality) : rng.int(6, 14);
if (!Number.isInteger(quality) || quality < 1 || quality > 20) {
  throw new Error('--quality must be a whole number from 1 to 20');
}
const approach: Approach = (values.approach as Approach | undefined) ?? rng.pick(['quiet', 'loud']);

const plan: CollectionPlan = {
  crew: generateCrew(rng, quality),
  approach,
  business: rng.pick(BEACH_STRIP_BUSINESSES),
  district: BEACH_STRIP,
};
const result = runCollection(plan, rng);

console.log('');
for (const line of renderCollection(plan, result)) {
  console.log(line);
}
console.log('');
console.log(`Seed: ${seed} · Crew quality: ${quality}`);
console.log('');
