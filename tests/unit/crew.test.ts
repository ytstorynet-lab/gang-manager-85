import { describe, expect, it } from 'vitest';
import { SKILLS, averageSkill, generateCrewMember } from '../../src/sim/crew';
import { ROLES, generateCrew } from '../../src/sim/jobs/collection';
import { createRng } from '../../src/sim/rng';

describe('crew members', () => {
  it('are the same every time for the same seed', () => {
    const first = generateCrewMember(createRng('crew'), { id: 'a' });
    const second = generateCrewMember(createRng('crew'), { id: 'a' });
    expect(second).toEqual(first);
  });

  it('keep every skill and hidden trait a whole number from 1 to 20', () => {
    const rng = createRng('ranges');
    const outOfRange: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const member = generateCrewMember(rng, { id: `m${i}`, quality: rng.int(1, 20) });
      const values = [
        ...SKILLS.map((skill) => member.skills[skill]),
        member.hidden.loyalty,
        member.hidden.greed,
      ];
      for (const value of values) {
        if (!Number.isInteger(value) || value < 1 || value > 20) outOfRange.push(String(value));
      }
    }
    expect(outOfRange).toEqual([]);
  });

  it('are better on average when generated at a higher quality', () => {
    const rng = createRng('quality');
    const averageAt = (quality: number): number => {
      let total = 0;
      for (let i = 0; i < 500; i++) {
        total += averageSkill(generateCrewMember(rng, { id: 'x', quality }));
      }
      return total / 500;
    };
    expect(averageAt(14) - averageAt(6)).toBeGreaterThan(6);
  });

  it('never share a first name or a surname within a crew', () => {
    const rng = createRng('names');
    for (let i = 0; i < 1000; i++) {
      const members = Object.values(generateCrew(rng, 10));
      expect(new Set(members.map((member) => member.firstName)).size).toBe(ROLES.length);
      expect(new Set(members.map((member) => member.surname)).size).toBe(ROLES.length);
    }
  });
});
