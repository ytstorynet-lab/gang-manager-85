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
  'menu.newGame': 'New game',
  'menu.newGameSoon': 'Not playable yet',
  'menu.quit': 'Quit',
  'build.version': 'Version {version}',
  'build.browser': 'Browser build',
  'build.desktop': 'Desktop build',

  // Places
  'district.beachStrip': 'The beach strip',

  // Crew roles
  'role.driver': 'Driver',
  'role.talker': 'Talker',
  'role.muscle': 'Muscle',
  'role.lookout': 'Lookout',

  // Jobs and their results
  'job.collection': 'The collection',
  'job.approach.quiet': 'Quiet',
  'job.approach.loud': 'Loud',
  'job.outcome.clean': 'Clean',
  'job.outcome.messy': 'Messy',
  'job.outcome.botched': 'Botched',
  'job.outcome.busted': 'Busted',
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
} as const;

export type MessageKey = keyof typeof en;
