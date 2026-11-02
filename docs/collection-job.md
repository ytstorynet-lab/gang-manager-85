# How the collection works

The collection is the first job: the crew picks up a business's weekly protection money. This page explains the rules so they can be judged and tuned. Every number lives in `TUNING` in `src/sim/jobs/collection.ts`.

## Crew members

Each crew member has eight skills rated 1 to 20, like Football Manager: Driving, Muscle, Talking, Planning, Discretion, Nerve, Composure and Fitness. Two hidden traits, Loyalty and Greed, are never shown to the player. A generated crew member's skills sit near a chosen quality level, with one or two that stand out.

## Skill checks

Every risky moment is a check: a 20-sided die plus the skill against a difficulty. Each point of skill adds 5% to the chance of success, so a skill of 10 against difficulty 21 succeeds half the time. Rolling a 1 is a blunder.

The crew's best planner sets a planning bonus from -2 to +2 that applies to every check in the job.

## The four roles

| Role    | Main skills               | What they do                                                       |
| ------- | ------------------------- | ------------------------------------------------------------------ |
| Driver  | Driving, Composure, Nerve | Stays calm when a patrol passes, and gets everyone away in a chase |
| Talker  | Talking, Composure        | Persuades the owner to pay, calms the room, carries the envelope   |
| Muscle  | Muscle, Nerve             | Scares the owner, faces down doormen and rivals                    |
| Lookout | Discretion                | Spots patrols and rival crews early                                |

Everyone's Fitness matters if the car is stopped and the crew has to run.

## The three stages

1. **Arrive.** A patrol may pass (35% on the beach strip) and rivals may be about (25%). A sharp lookout spots them early. If the patrol isn't spotted, a calm driver can still avoid suspicion; otherwise the police may come back later.
2. **Inside.** Quiet: the talker tries to talk the owner round, gets a second try on Composure, and then the muscle steps in. Loud: the muscle goes straight in, faces down any doorman, and collects the envelope plus a 25% late fee, but draws much more heat. Someone may call the police.
3. **Leave.** Rivals may block the street, and the muscle needs the Nerve to stand firm and the Muscle to make them back off. Then the police may come: much more likely if a patrol took a good look earlier or someone phoned them. The driver needs Nerve and Driving to get away. If the car is stopped, each crew member runs, and anyone too slow is arrested.

## Sideline calls

The job plays out one line of commentary at a time. After some lines the boss can make a call, and the crew acts on it straight away. With no calls, the crew uses its own judgement. A sharp lookout gets everyone down when a patrol passes without being told.

| Call     | When it can be made                                                                                                          | What happens                                                                                                                                                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pull out | Any time before the money is collected                                                                                       | Everyone leaves at once. No money, and nothing else can go wrong. The job is called off.                                                                                                                                                                                                                           |
| Go loud  | On a quiet job, from when the crew reach the business until the money is collected, unless the muscle has already stepped in | The muscle walks in, and it's a loud job from there: the late fee on top, but loud heat and the chance someone phones the police.                                                                                                                                                                                  |
| Lie low  | When a patrol has noticed the crew, the lookout spots the rivals circling, or the rivals block the street                    | The crew waits until the danger has gone. Before going in, each wait makes the owner edgier (2 harder to talk round or scare) and gives a 20% chance they lock up for the night. When rivals block the street, the crew waits inside: the owner may phone the police, and the rivals only give up 55% of the time. |

Every call trades money against risk. For average crews on quiet jobs (4,000 jobs each, from `npm run sim:batch`):

| Calls                       | Clean | Botched | Busted | Money  | Heat |
| --------------------------- | ----- | ------- | ------ | ------ | ---- |
| No calls                    | 74.6% | 3.7%    | 1.5%   | $1,023 | 3.2  |
| Lie low when you can        | 78.8% | 4.5%    | 1.3%   | $1,014 | 2.8  |
| Go loud if the owner stalls | 72.3% | 3.9%    | 3.4%   | $1,071 | 4.8  |
| Pull out if noticed         | 74.2% | 3.7%    | 1.1%   | $1,006 | 3.1  |

## Replays

The same seed with the same calls always plays out the same way, and a call changes nothing before the moment it's made. Tests replay thousands of jobs with random calls to check both.

## Outcomes

| Outcome    | When                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| Clean      | The money is collected and nothing went wrong                          |
| Messy      | The money is collected, but with a fight, a chase, rivals or high heat |
| Botched    | No money reaches the organisation                                      |
| Busted     | At least one crew member is arrested                                   |
| Called off | The boss pulled the crew out                                           |

Each crew member gets a rating out of 10, starting from 6 and moving with how they did and how the job went.

## Greed

The talker carries the envelope. A greedy talker who isn't very loyal sometimes keeps 5 to 15% of it. The player isn't told, but the takings come in a little light.
