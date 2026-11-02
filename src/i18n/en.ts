/**
 * Every piece of text the player sees lives here, keyed by an id.
 *
 * To add a language: copy this file (for example to de.ts), translate the values,
 * keep every {placeholder} exactly as it is, and register the file in index.ts.
 */
export const en = {
  // Title screen
  'game.title': "Gang Manager '85",
  'title.tagline': 'Run the crew. Take the city. Rico City, 1985.',
  'menu.label': 'Main menu',
  'menu.watchJob': 'Watch a job',
  'menu.watchJobNote': 'One job on the beach strip, with you making the calls.',
  'menu.quit': 'Quit',
  'build.version': 'Version {version}',
  'build.browser': 'Browser build',
  'build.desktop': 'Desktop build',

  // Places
  'district.beachStrip': 'The beach strip',

  // Crew roles and skills
  'role.driver': 'Driver',
  'role.talker': 'Talker',
  'role.muscle': 'Muscle',
  'role.lookout': 'Lookout',
  'skill.driving': 'Driving',
  'skill.muscle': 'Muscle',
  'skill.talking': 'Talking',
  'skill.planning': 'Planning',
  'skill.discretion': 'Discretion',
  'skill.nerve': 'Nerve',
  'skill.composure': 'Composure',
  'skill.fitness': 'Fitness',

  // Before the job
  'briefing.intro': "Pick up this week's protection money from a business on the beach strip.",
  'briefing.crew': 'Your crew',
  'briefing.newCrew': 'New crew',
  'briefing.age': 'Age {age}',
  'briefing.business': 'The business',
  'briefing.envelope': '{amount} a week',
  'briefing.owner.easy': 'Easy-going owner',
  'briefing.owner.careful': 'Careful owner',
  'briefing.owner.stubborn': 'Stubborn owner',
  'briefing.owner.hard': 'Hard-nosed owner',
  'briefing.doorman.none': 'No doorman',
  'briefing.doorman.some': 'Doorman',
  'briefing.doorman.tough': 'Tough doorman',
  'briefing.approach': 'The approach',
  'briefing.quiet': '{talker} goes in alone and asks nicely. Little heat, but the owner may stall.',
  'briefing.loud': '{muscle} goes in first. A late fee on top, but much more heat.',
  'briefing.start': 'Start the job',
  'briefing.back': 'Back',

  // Watching the job
  'watch.speed': 'Speed',
  'watch.pause': 'Pause',
  'watch.speedValue': '{speed}×',
  'watch.commentary': 'Commentary',
  'watch.calls': 'Sideline calls',
  'watch.callSent': 'Calling the crew…',
  'watch.fps': '{fps} fps',
  'watch.stressTest': 'Stress test',
  'watch.stressTestOn': '+{count} people',
  'call.pullOut': 'Pull out',
  'call.goLoud': 'Go loud',
  'call.lieLow': 'Lie low',
  'call.pullOut.hint': 'Leave now. No money, but no more risk.',
  'call.goLoud.hint': 'Send the muscle in. More money, more heat.',
  'call.lieLow.hint': 'Wait for the coast to clear. Safer, but the owner gets edgy.',

  // After the job
  'results.heading': 'How it went',
  'results.money': 'Money',
  'results.heat': 'Heat',
  'results.injured': 'Injured',
  'results.arrested': 'Arrested',
  'results.nobody': 'Nobody',
  'results.calls': 'Your calls',
  'results.noCalls': 'None. You let the crew get on with it.',
  'results.callAt': '{call} at {time}',
  'results.again': 'Watch another job',
  'results.menu': 'Main menu',
  'results.seed': 'Seed {seed}',

  // Jobs and their results
  'job.collection': 'The collection',
  'job.approach.quiet': 'Quiet',
  'job.approach.loud': 'Loud',
  'job.outcome.clean': 'Clean',
  'job.outcome.messy': 'Messy',
  'job.outcome.botched': 'Botched',
  'job.outcome.busted': 'Busted',
  'job.outcome.calledOff': 'Called off',
  'job.outcomeNote.clean': 'In and out, and nobody any the wiser.',
  'job.outcomeNote.messy': 'The money came in, but people will talk.',
  'job.outcomeNote.botched': 'Nothing to show for the night.',
  'job.outcomeNote.busted': 'Somebody is spending the night in a cell.',
  'job.outcomeNote.calledOff': 'You pulled the crew out.',
  'job.result.money': 'Money: {amount}',
  'job.result.heat': 'Heat: +{heat}',
  'job.result.noInjuries': 'No injuries',
  'job.result.injured': 'Injured: {names}',
  'job.result.noArrests': 'No arrests',
  'job.result.arrested': 'Arrested: {names}',
  'job.result.ratings': 'Ratings',

  // The collection, play by play: arriving
  'collection.arrive.parkAlley': '{driver} pulls into the alley behind the {business}.',
  'collection.arrive.parkStreet':
    '{driver} parks across the street from the {business} and kills the lights.',
  'collection.arrive.lookout': '{lookout} takes the corner and watches the street.',
  'collection.arrive.goodPlan':
    '{planner} has timed this to the minute. Everyone knows their part.',
  'collection.arrive.badPlan': 'Nobody is quite sure whose idea this was.',
  'collection.patrol.spotted':
    '{lookout} spots a patrol car early and waves the crew down until it has passed.',
  'collection.patrol.coolDriver':
    "A patrol car crawls past. {driver} watches it in the mirror and doesn't move.",
  'collection.patrol.noticed':
    'A patrol car slows right beside {driver}, then drives on. Somebody took a good look.',
  'collection.rivals.spotted': "{lookout} clocks the importers' car circling the block.",

  // Inside
  'collection.inside.ownerEdgy':
    'The owner of the {business} has been watching the car outside and is on edge.',
  'collection.inside.lockedUp':
    'The owner of the {business} has seen enough and locks the door. No envelope tonight.',

  // Inside, the quiet way
  'collection.quiet.enter': '{talker} straightens a jacket and walks into the {business}.',
  'collection.quiet.saysTooMuch':
    '{talker} talks too much and names names. Someone behind the counter is listening.',
  'collection.quiet.pays': 'The owner hands over the envelope with a tight smile: {amount}.',
  'collection.quiet.paysFamily':
    'The owner pays up and asks {talker} to say hello to the family: {amount}.',
  'collection.quiet.paysWarmly':
    '{talker} has the owner laughing. The envelope comes with a drink on the house: {amount}.',
  'collection.quiet.stalls': 'The owner of the {business} says business is slow this week.',
  'collection.quiet.talkedRound':
    '{talker} explains how much slower business gets without friends. The owner pays: {amount}.',
  'collection.quiet.muscleStepsIn': '{talker} gets nowhere. {muscle} comes in from the door.',

  // Inside, the loud way
  'collection.loud.enter':
    '{muscle} shoves the door open with {talker} close behind. The {business} goes quiet.',
  'collection.loud.doormanBacksOff':
    'The doorman sizes up {muscle} and decides tonight is not his night.',
  'collection.loud.doormanFight': "The doorman squares up to {muscle}. It's short, loud and ugly.",
  'collection.loud.paysLateFee': 'The owner pays, plus a late fee for the trouble: {amount}.',
  'collection.loud.pays': 'The owner pays in full: {amount}.',
  'collection.loud.partial': 'The owner only has half of it in the till: {amount}.',
  'collection.loud.callsPolice': 'Somebody slips out the back to find a payphone.',
  'collection.loud.calmsRoom':
    '{talker} tells everyone to go back to what they were doing. Nobody saw anything.',

  // Leaving
  'collection.leave.calmBoulevard': '{driver} pulls out onto the boulevard, unhurried.',
  'collection.leave.calmBeach': '{driver} takes the long way home along the beach. Nobody follows.',
  'collection.leave.rivalsExpected':
    "The importers' car blocks the end of the street. {lookout} saw this coming.",
  'collection.leave.rivalsAmbush':
    "The importers' car blocks the end of the street. Nobody saw it coming.",
  'collection.leave.handsOver': '{muscle} hands over the envelope without a word.',
  'collection.leave.rivalsBackOff':
    '{muscle} gets out of the car. The importers think better of it and reverse away.',
  'collection.leave.rivalsTakeIt':
    'It turns into a brawl. The importers drive off with the envelope.',
  'collection.leave.sirens': 'Sirens on the boulevard. Blue lights in the mirror.',
  'collection.leave.driverRattled': "{driver}'s hands are shaking on the wheel.",
  'collection.leave.escapeParkingLot':
    '{driver} cuts through a parking lot and loses them in the back streets.',
  'collection.leave.escapeRedLights':
    '{driver} runs two red lights and is gone before the patrol car can turn.',
  'collection.leave.boxedIn': 'The patrol car boxes {driver} in. Doors fly open and everyone runs.',
  'collection.leave.escapesOnFoot': '{name} goes over a fence and disappears.',
  'collection.leave.arrested': '{name} is pinned against a car and cuffed.',
  'collection.leave.envelopeSeized': 'The police find the envelope.',
  'collection.injury.minor': '{name} picks up cuts and bruises.',
  'collection.injury.serious': '{name} needs a doctor who asks no questions.',

  // The boss's calls
  'collection.pullOut.beforeGoingIn':
    'The car phone rings. The boss is calling it off, and {driver} pulls away quietly.',
  'collection.pullOut.talkerLeaves':
    'The car phone rings. The boss is calling it off, so {talker} makes an excuse and walks out.',
  'collection.pullOut.crewLeaves':
    'The car phone rings. The boss is calling it off, so {muscle} and {talker} back out of the {business} empty-handed.',
  'collection.pullOut.driveAway': '{driver} pulls away quietly. Nobody follows.',
  'collection.goLoud.walksIn':
    'The car phone rings. The boss wants it done the hard way, and {muscle} walks in off the street.',
  'collection.lieLow.patrol':
    'The car phone rings. The boss says sit tight, so the crew waits with the lights off until the street is quiet.',
  'collection.lieLow.rivals':
    "The car phone rings. The boss says sit tight, so the crew waits for the importers' car to move on.",
  'collection.lieLow.blocked':
    'The car phone rings. The boss says sit tight, so the crew heads back into the {business} to wait the importers out.',
  'collection.lieLow.ownerSweet': '{talker} keeps the owner sweet while they wait.',
  'collection.lieLow.ownerPhones': 'The owner wants them gone and reaches for the phone.',
  'collection.lieLow.rivalsGiveUp': 'The importers get bored and drive off.',
  'collection.lieLow.rivalsWait': "The importers are still out there. There's no way round them.",
} as const;

export type MessageKey = keyof typeof en;
