import { expect, test, type Page } from '@playwright/test';

// A whole job takes a while to watch, even at 4x.
test.setTimeout(120_000);

/** Collects script errors and blocked resources, so a test can check there were none. */
function problemsOn(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  return problems;
}

/** Goes from the title screen to a job that's playing, with a fixed seed. */
async function startJob(page: Page, business: string, approach: string): Promise<void> {
  await page.goto('/?seed=browser-test');
  await page.getByRole('button', { name: 'Watch a job' }).click();
  await expect(page.getByRole('heading', { name: 'The collection' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your crew' })).toBeVisible();
  await page.getByRole('radio', { name: business }).check();
  await page.getByRole('radio', { name: approach }).check();
  await page.getByRole('button', { name: 'Start the job' }).click();

  const watch = page.getByTestId('watch');
  await expect(watch).toHaveAttribute('data-scene', 'ready');
  await expect(watch).toHaveAttribute('data-state', 'playing');
  await expect(page.getByRole('heading', { name: 'Commentary' })).toBeVisible();
}

test('the boss watches a whole job at 4x and sends the muscle in', async ({ page }) => {
  const problems = problemsOn(page);
  await startJob(page, 'Neptune Video', 'Quiet');

  const fastest = page.getByRole('button', { name: '4×' });
  await fastest.click();
  await expect(fastest).toHaveAttribute('aria-pressed', 'true');

  // Going loud is offered once the talker is inside. Clicking waits until it is.
  await page.getByRole('button', { name: /^Go loud/ }).click({ timeout: 60_000 });
  await expect(page.getByText('The boss wants it done the hard way')).toBeVisible();

  const watch = page.getByTestId('watch');
  await expect(watch).toHaveAttribute('data-state', 'finished', { timeout: 90_000 });
  const results = page.getByRole('region', { name: /Clean|Messy|Botched|Busted/ });
  await expect(results).toBeVisible();
  await expect(results.getByText('How it went')).toBeVisible();
  await expect(results.getByText(/^Go loud at \d\d:\d\d$/)).toBeVisible();
  await expect(results.getByText('Driver', { exact: true })).toBeVisible();

  await results.getByRole('button', { name: 'Watch another job' }).click();
  await expect(page.getByRole('heading', { name: 'Your crew' })).toBeVisible();

  expect(problems).toEqual([]);
});

test('pulling the crew out calls the job off with no money and no arrests', async ({ page }) => {
  const problems = problemsOn(page);
  await startJob(page, 'Starlight Lounge', 'Loud');

  await page.getByRole('button', { name: /^Pull out/ }).click();
  await expect(page.getByText('Calling the crew…')).toBeVisible();
  await expect(page.getByText('The boss is calling it off')).toBeVisible();

  const watch = page.getByTestId('watch');
  await expect(watch).toHaveAttribute('data-state', 'finished', { timeout: 60_000 });
  await expect(watch).toHaveAttribute('data-outcome', 'calledOff');
  const results = page.getByRole('region', { name: 'Called off' });
  await expect(results.getByText('$0')).toBeVisible();
  await expect(results.getByText(/^Pull out at \d\d:\d\d$/)).toBeVisible();

  await results.getByRole('button', { name: 'Main menu' }).click();
  await expect(page.getByRole('heading', { name: "Gang Manager '85" })).toBeVisible();

  expect(problems).toEqual([]);
});

test('the speed controls pause the job, and the keyboard works too', async ({ page }) => {
  await startJob(page, 'Coral Wash Laundromat', 'Quiet');
  const lines = page.locator('.feed-line');
  await expect(lines).toHaveCount(1);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(6000);
  await expect(lines).toHaveCount(1);

  await page.locator('body').press('3');
  await expect(page.getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true');
  await expect(lines).toHaveCount(2, { timeout: 10_000 });
});
