/** Before the job: meet the crew, pick the business and choose how to go about it. */
import { t } from '../i18n';
import { formatMoney } from '../report/collection-report';
import { SKILLS } from '../sim/crew';
import { ROLES, type Approach } from '../sim/jobs/collection';
import { BEACH_STRIP_BUSINESSES, type Business } from '../sim/world';
import { button, element, type Cleanup } from './dom';
import { KEY_SKILLS, doormanKey, ownerKey, skillBand, type CrewSetup } from './job-setup';

export interface BriefingOptions {
  readonly crew: CrewSetup;
  /** The choices from last time, kept when the player comes back for another job. */
  readonly business?: Business;
  readonly approach?: Approach;
  readonly onNewCrew: (choice: { business: Business; approach: Approach }) => void;
  readonly onStart: (choice: { business: Business; approach: Approach }) => void;
  readonly onBack: () => void;
}

export function showBriefing(host: HTMLElement, options: BriefingOptions): Cleanup {
  const { crew } = options.crew;
  const screen = element('main', 'briefing');
  screen.setAttribute('aria-labelledby', 'briefing-title');

  const header = element('header', 'screen-header');
  const title = element('h1', 'screen-title', t('job.collection'));
  title.id = 'briefing-title';
  title.tabIndex = -1;
  header.append(
    element('p', 'eyebrow', t('district.beachStrip')),
    title,
    element('p', 'screen-intro', t('briefing.intro')),
  );

  // The crew, with every skill and the ones that matter for their role picked out.
  const crewPanel = element('section', 'panel crew-panel');
  crewPanel.setAttribute('aria-labelledby', 'crew-heading');
  const crewHead = element('div', 'panel-head');
  const crewHeading = element('h2', 'panel-title', t('briefing.crew'));
  crewHeading.id = 'crew-heading';
  const crewList = element('ul', 'crew-list');
  for (const role of ROLES) {
    const member = crew[role];
    const card = element('li', `crew-card role-${role}`);
    const head = element('div', 'crew-card-head');
    head.append(
      element('span', 'role-chip', t(`role.${role}`)),
      element('span', 'crew-name', `${member.firstName} ${member.surname}`),
      element('span', 'crew-age', t('briefing.age', { age: member.age })),
    );
    const skills = element('dl', 'skills');
    for (const skill of SKILLS) {
      const value = member.skills[skill];
      const item = element('div', KEY_SKILLS[role].includes(skill) ? 'skill key' : 'skill');
      item.append(
        element('dt', undefined, t(`skill.${skill}`)),
        element('dd', `rating band-${skillBand(value)}`, String(value)),
      );
      skills.append(item);
    }
    card.append(head, skills);
    crewList.append(card);
  }

  // The business and the approach.
  const jobPanel = element('section', 'panel job-panel');
  const businessSet = element('fieldset', 'choices businesses');
  businessSet.append(element('legend', 'panel-title', t('briefing.business')));
  const chosenBusiness = options.business ?? BEACH_STRIP_BUSINESSES[0];
  for (const business of BEACH_STRIP_BUSINESSES) {
    const meta = [
      t('briefing.envelope', { amount: formatMoney(business.envelope) }),
      t(ownerKey(business.resolve)),
      t(doormanKey(business.doorman)),
    ].join(' · ');
    businessSet.append(
      choice('business', business.id, business.name, meta, business === chosenBusiness),
    );
  }

  const approachSet = element('fieldset', 'choices approaches');
  approachSet.append(element('legend', 'panel-title', t('briefing.approach')));
  const chosenApproach = options.approach ?? 'quiet';
  const names = { talker: crew.talker.firstName, muscle: crew.muscle.firstName };
  for (const approach of ['quiet', 'loud'] as const) {
    approachSet.append(
      choice(
        'approach',
        approach,
        t(`job.approach.${approach}`),
        t(`briefing.${approach}`, names),
        approach === chosenApproach,
      ),
    );
  }

  const current = (): { business: Business; approach: Approach } => {
    const businessId = screen.querySelector<HTMLInputElement>(
      'input[name="business"]:checked',
    )?.value;
    const business =
      BEACH_STRIP_BUSINESSES.find((candidate) => candidate.id === businessId) ??
      BEACH_STRIP_BUSINESSES[0]!;
    const approach =
      screen.querySelector<HTMLInputElement>('input[name="approach"]:checked')?.value === 'loud'
        ? 'loud'
        : 'quiet';
    return { business, approach };
  };

  crewHead.append(
    crewHeading,
    button('small-button', t('briefing.newCrew'), () => options.onNewCrew(current())),
  );
  crewPanel.append(crewHead, crewList);

  const actions = element('div', 'actions');
  actions.append(
    button('menu-button primary', t('briefing.start'), () => options.onStart(current())),
    button('menu-button', t('briefing.back'), options.onBack),
  );
  jobPanel.append(businessSet, approachSet, actions);

  const grid = element('div', 'briefing-grid');
  grid.append(crewPanel, jobPanel);
  screen.append(header, grid);
  host.replaceChildren(screen);
  title.focus();

  return () => screen.remove();
}

/** A radio button with a title and a line of detail. */
function choice(
  name: string,
  value: string,
  title: string,
  detail: string,
  checked: boolean,
): HTMLLabelElement {
  const label = element('label', 'choice');
  const input = element('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  // The title names the choice; the detail is read out after it as a description.
  const titleText = element('span', 'choice-title', title);
  titleText.id = `${name}-${value}-title`;
  const detailText = element('span', 'choice-detail', detail);
  detailText.id = `${name}-${value}-detail`;
  input.setAttribute('aria-labelledby', titleText.id);
  input.setAttribute('aria-describedby', detailText.id);
  const text = element('span', 'choice-text');
  text.append(titleText, detailText);
  label.append(input, text);
  return label;
}
