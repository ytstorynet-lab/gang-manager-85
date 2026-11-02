/** Turns a collection's result into readable lines of text, in the current language. */
import { t } from '../i18n';
import {
  ROLES,
  type CollectionPlan,
  type CollectionResult,
  type LogEntry,
} from '../sim/jobs/collection';

/** 1421 becomes "23:41"; times after midnight wrap round to "00:05". */
export function formatTime(minute: number): string {
  const wrapped = ((minute % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** 1800 becomes "$1,800". */
export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/** One line of the play-by-play, without its time. Money amounts get a dollar sign. */
export function entryText(entry: LogEntry): string {
  const params: Record<string, string | number> = { ...entry.params };
  if (typeof params['amount'] === 'number') {
    params['amount'] = formatMoney(params['amount']);
  }
  return t(entry.key, params);
}

/** The whole job as plain text: header, timed play-by-play and the result. */
export function renderCollection(plan: CollectionPlan, result: CollectionResult): string[] {
  const { crew, business, approach, district } = plan;
  const nameOf = (id: string): string =>
    ROLES.map((role) => crew[role]).find((member) => member.id === id)?.firstName ?? id;

  const lines = [
    `${t('job.collection').toUpperCase()} · ${t(`job.approach.${approach}`)}`,
    `${business.name}, ${t(district.nameKey).toLowerCase()} · ${formatMoney(business.envelope)}`,
    ROLES.map((role) => `${t(`role.${role}`)}: ${crew[role].firstName} ${crew[role].surname}`).join(
      ' · ',
    ),
    '',
    ...result.log.map((entry) => `${formatTime(entry.minute)}  ${entryText(entry)}`),
    '',
    `${t(`job.outcome.${result.outcome}`).toUpperCase()}`,
    [
      t('job.result.money', { amount: formatMoney(result.money) }),
      t('job.result.heat', { heat: result.heat }),
      result.injuries.length === 0
        ? t('job.result.noInjuries')
        : t('job.result.injured', {
            names: result.injuries.map((injury) => nameOf(injury.memberId)).join(', '),
          }),
      result.arrests.length === 0
        ? t('job.result.noArrests')
        : t('job.result.arrested', { names: result.arrests.map(nameOf).join(', ') }),
    ].join(' · '),
    `${t('job.result.ratings')}: ${ROLES.map(
      (role) => `${crew[role].firstName} ${result.ratings[role].toFixed(1)}`,
    ).join(' · ')}`,
  ];
  if (result.calls.length > 0) {
    lines.push(`${t('results.calls')}: ${callsText(result)}`);
  }
  return lines;
}

/** The boss's calls with their times, such as "Go loud at 23:41". */
export function callsText(result: CollectionResult): string {
  return result.calls
    .map((made) => {
      const minute = result.log[made.beat]?.minute ?? 0;
      return t('results.callAt', { call: t(`call.${made.call}`), time: formatTime(minute) });
    })
    .join(' · ');
}
