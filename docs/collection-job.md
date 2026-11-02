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
3. **Leave.** Rivals may block the street, and the muscle needs the Nerve to stand firm and the Muscle to make them back off. If the police come, the driver needs Nerve and Driving to get away. If the car is stopped, each crew member runs, and anyone too slow is arrested.

## Outcomes

| Outcome | When                                                                   |
| ------- | ---------------------------------------------------------------------- |
| Clean   | The money is collected and nothing went wrong                          |
| Messy   | The money is collected, but with a fight, a chase, rivals or high heat |
| Botched | No money reaches the organisation                                      |
| Busted  | At least one crew member is arrested                                   |

Each crew member gets a rating out of 10, starting from 6 and moving with how they did and how the job went.

## Greed

The talker carries the envelope. A greedy talker who isn't very loyal sometimes keeps 5 to 15% of it. The player isn't told, but the takings come in a little light.
