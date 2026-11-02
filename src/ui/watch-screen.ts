/**
 * Watching the job: the block plays out in the city view while the commentary runs down the
 * side. The boss can change the speed and make sideline calls, then sees how it went.
 */
import type { CityView } from '../city/city-view';
import { JobDirector } from '../city/job-director';
import type { JobScene } from '../city/job-scene';
import { t } from '../i18n';
import { callsText, entryText, formatMoney, formatTime } from '../report/collection-report';
import {
  CALLS,
  ROLES,
  TUNING,
  type Beat,
  type Call,
  type CollectionPlan,
  type CollectionResult,
} from '../sim/jobs/collection';
import { createRng } from '../sim/rng';
import { BEACH_STRIP } from '../sim/world';
import { button, element, type Cleanup } from './dom';
import { ratingBand, type JobSetup } from './job-setup';
import { JobPlayer, SPEEDS, type Speed } from './job-player';

export interface WatchOptions {
  readonly setup: JobSetup;
  /** The city view, or nothing if it couldn't start (the job still plays as commentary). */
  readonly city: CityView | undefined;
  readonly onAgain: () => void;
  readonly onMenu: () => void;
}

/** How long to show the empty block before the first line, in seconds at normal speed. */
const INTRO_SECONDS = 0.8;

/** Crowd sizes for the stress test, which checks the city view stays smooth. */
const STRESS_STEPS = [0, 1000, 5000] as const;

/** How long a line stays on screen at normal speed: longer lines and big moments get longer. */
function beatSeconds(beat: Beat): number {
  const moment = beat.calls.includes('goLoud') || beat.calls.includes('lieLow');
  const seconds = 1.6 + entryText(beat.entry).length * 0.032 + (moment ? 2.5 : 0);
  return Math.min(8.5, Math.max(2.2, seconds));
}

/** Lines where the crew act on the boss's call, shown in the boss's colour. */
function isCallLine(beat: Beat): boolean {
  const key = beat.entry.key;
  return (
    key.startsWith('collection.pullOut.') ||
    key.startsWith('collection.goLoud.') ||
    key === 'collection.lieLow.patrol' ||
    key === 'collection.lieLow.rivals' ||
    key === 'collection.lieLow.blocked'
  );
}

export function showWatchScreen(host: HTMLElement, options: WatchOptions): Cleanup {
  const { setup, city } = options;
  const plan: CollectionPlan = {
    crew: setup.crew.crew,
    approach: setup.approach,
    business: setup.business,
    district: BEACH_STRIP,
  };
  const director = new JobDirector(plan);

  const screen = element('main', 'watch');
  screen.dataset['testid'] = 'watch';
  screen.dataset['state'] = 'loading';
  screen.setAttribute('aria-label', `${t('job.collection')}: ${setup.business.name}`);

  // The bar along the top: which job, the time and the speed.
  const bar = element('header', 'watch-bar');
  const titles = element('div', 'watch-titles');
  titles.append(
    element('span', 'eyebrow', `${t('job.collection')} · ${t(`job.approach.${setup.approach}`)}`),
    element('span', 'watch-business', setup.business.name),
  );
  const clock = element('time', 'watch-clock', formatTime(TUNING.startMinute));
  const speedGroup = element('div', 'speed');
  speedGroup.setAttribute('role', 'group');
  speedGroup.setAttribute('aria-label', t('watch.speed'));
  const speedButtons = new Map<Speed, HTMLButtonElement>();
  for (const speed of SPEEDS) {
    const label = speed === 0 ? t('watch.pause') : t('watch.speedValue', { speed });
    const control = button('speed-button', label, () => setSpeed(speed));
    speedButtons.set(speed, control);
    speedGroup.append(control);
  }
  bar.append(titles, clock, speedGroup);

  // The sideline calls.
  const callsPanel = element('section', 'calls');
  callsPanel.setAttribute('aria-label', t('watch.calls'));
  const callButtons = new Map<Call, HTMLButtonElement>();
  for (const call of CALLS) {
    const control = element('button', 'call-button');
    control.type = 'button';
    control.dataset['call'] = call;
    control.disabled = true;
    control.append(
      element('span', 'call-name', t(`call.${call}`)),
      element('span', 'call-hint', t(`call.${call}.hint`)),
    );
    control.addEventListener('click', () => makeCall(call));
    callButtons.set(call, control);
    callsPanel.append(control);
  }
  const callStatus = element('p', 'call-status');
  callStatus.setAttribute('role', 'status');
  callsPanel.append(callStatus);

  // The commentary down the side.
  const commentary = element('aside', 'commentary');
  commentary.setAttribute('aria-labelledby', 'commentary-heading');
  const commentaryHeading = element('h2', 'panel-title', t('watch.commentary'));
  commentaryHeading.id = 'commentary-heading';
  const feed = element('ol', 'feed');
  feed.setAttribute('aria-live', 'polite');
  commentary.append(commentaryHeading, feed);

  // The speed check: frames per second, and a stress test that fills the block with people.
  const meter = element('div', 'frame-meter');
  const fpsText = element('span', 'fps', t('watch.fps', { fps: '…' }));
  let stressStep = 0;
  const stressButton = button('small-button', t('watch.stressTest'), () => {
    stressStep = (stressStep + 1) % STRESS_STEPS.length;
    const count = STRESS_STEPS[stressStep] ?? 0;
    scene?.setCrowd(count);
    stressButton.textContent =
      count === 0
        ? t('watch.stressTest')
        : t('watch.stressTestOn', { count: count.toLocaleString('en-US') });
    stressButton.setAttribute('aria-pressed', String(count > 0));
  });
  stressButton.setAttribute('aria-pressed', 'false');
  meter.append(fpsText, stressButton);

  const results = element('section', 'results');
  results.hidden = true;
  results.setAttribute('aria-labelledby', 'results-outcome');

  screen.append(bar, callsPanel, commentary, meter, results);
  host.replaceChildren(screen);

  // Playing the job.
  const player = new JobPlayer(
    plan,
    createRng(`job:${setup.seed}`),
    { beat: onBeat, finish: onFinish },
    { beatSeconds },
  );
  let scene: JobScene | undefined;
  let ready = false;
  let intro = INTRO_SECONDS;
  let lastSpeed: Speed = 1;
  let fpsTimer = 0;
  setSpeed(1);

  const focus = (): void => city?.setFocusWidth(commentary.getBoundingClientRect().left);
  if (city) {
    city
      .showJob(director, setup.business)
      .then((shown) => {
        scene = shown;
        screen.dataset['scene'] = 'ready';
        focus();
      })
      .catch((error: unknown) => console.error('The city view could not show the job', error))
      .finally(() => (ready = true));
  } else {
    ready = true;
  }
  window.addEventListener('resize', focus);

  const stopFrames = city ? city.everyFrame(frame) : animationFrames(frame);

  function frame(seconds: number): void {
    if (!ready) return;
    if (player.currentBeat === undefined && !player.finished) {
      intro -= seconds * player.speed;
      if (intro <= 0) {
        screen.dataset['state'] = 'playing';
        player.start();
      }
    } else {
      player.update(seconds);
    }
    director.update(player.progress);
    scene?.update(seconds * player.speed);

    fpsTimer -= seconds;
    if (fpsTimer <= 0 && city) {
      fpsTimer = 0.5;
      fpsText.textContent = t('watch.fps', { fps: Math.round(city.fps) });
    }
  }

  function onBeat(beat: Beat): void {
    director.cue(beat.entry);
    clock.textContent = formatTime(beat.entry.minute);

    const line = element('li', 'feed-line');
    if (isCallLine(beat)) line.classList.add('is-call');
    const moment = beat.calls.includes('goLoud') || beat.calls.includes('lieLow');
    if (moment) line.classList.add('is-moment');
    line.append(
      element('time', 'feed-time', formatTime(beat.entry.minute)),
      element('span', 'feed-text', entryText(beat.entry)),
    );
    feed.append(line);
    feed.scrollTop = feed.scrollHeight;

    callStatus.textContent = '';
    for (const [call, control] of callButtons) {
      const offered = beat.calls.includes(call);
      control.disabled = !offered;
      control.classList.remove('is-made');
      control.classList.toggle('is-urgent', offered && call !== 'pullOut');
    }
  }

  function makeCall(call: Call): void {
    if (!player.makeCall(call)) return;
    callStatus.textContent = t('watch.callSent');
    for (const [other, control] of callButtons) {
      control.disabled = true;
      control.classList.remove('is-urgent');
      control.classList.toggle('is-made', other === call);
    }
  }

  function setSpeed(speed: Speed): void {
    if (speed > 0) lastSpeed = speed;
    player.setSpeed(speed);
    for (const [value, control] of speedButtons) {
      control.setAttribute('aria-pressed', String(value === speed));
    }
    screen.classList.toggle('is-paused', speed === 0);
  }

  function onFinish(result: CollectionResult): void {
    screen.dataset['state'] = 'finished';
    screen.dataset['outcome'] = result.outcome;
    callsPanel.hidden = true;
    showResults(result);
  }

  function showResults(result: CollectionResult): void {
    const nameOf = (id: string) =>
      ROLES.map((role) => plan.crew[role]).find((member) => member.id === id)?.firstName ?? id;
    const outcome = element('h2', `results-outcome outcome-${result.outcome}`);
    outcome.id = 'results-outcome';
    outcome.textContent = t(`job.outcome.${result.outcome}`);

    const stats = element('dl', 'results-stats');
    const stat = (label: string, value: string) => {
      const item = element('div', 'stat');
      item.append(element('dt', undefined, label), element('dd', undefined, value));
      stats.append(item);
    };
    stat(t('results.money'), formatMoney(result.money));
    stat(t('results.heat'), `+${result.heat}`);
    const names = (ids: readonly string[]) =>
      ids.length === 0 ? t('results.nobody') : ids.map(nameOf).join(', ');
    stat(t('results.injured'), names(result.injuries.map((injury) => injury.memberId)));
    stat(t('results.arrested'), names(result.arrests));

    const ratings = element('ul', 'ratings');
    for (const role of ROLES) {
      const value = result.ratings[role];
      const row = element('li', `rating-row role-${role}`);
      row.append(
        element('span', 'role-chip', t(`role.${role}`)),
        element('span', 'rating-name', `${plan.crew[role].firstName} ${plan.crew[role].surname}`),
        element('span', `rating band-${ratingBand(value)}`, value.toFixed(1)),
      );
      ratings.append(row);
    }

    const calls = element(
      'p',
      'results-calls',
      result.calls.length > 0 ? callsText(result) : t('results.noCalls'),
    );

    const again = button('menu-button primary', t('results.again'), options.onAgain);
    const actions = element('div', 'actions');
    actions.append(again, button('menu-button', t('results.menu'), options.onMenu));

    results.replaceChildren(
      element('p', 'eyebrow', t('results.heading')),
      outcome,
      element('p', 'results-note', t(`job.outcomeNote.${result.outcome}`)),
      stats,
      element('h3', 'panel-title', t('job.result.ratings')),
      ratings,
      element('h3', 'panel-title', t('results.calls')),
      calls,
      actions,
      element('p', 'results-seed', t('results.seed', { seed: setup.seed })),
    );
    results.hidden = false;
    again.focus();
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLButtonElement && event.key === ' ') return;
    if (event.key === ' ') {
      event.preventDefault();
      setSpeed(player.speed === 0 ? lastSpeed : 0);
    } else if (event.key === '1' || event.key === '2' || event.key === '3') {
      setSpeed(([1, 2, 4] as const)[Number(event.key) - 1] ?? 1);
    }
  };
  window.addEventListener('keydown', onKey);

  return () => {
    stopFrames();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', focus);
    city?.setFocusWidth(undefined);
    city?.showBackdrop();
    screen.remove();
  };
}

/** Runs `callback` every animation frame, for when there's no city view to drive it. */
function animationFrames(callback: (seconds: number) => void): () => void {
  let last = performance.now();
  let id = requestAnimationFrame(function tick(now) {
    callback((now - last) / 1000);
    last = now;
    id = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(id);
}
