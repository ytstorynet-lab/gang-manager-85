import { expect, test } from '@playwright/test';

test('the browser build opens on the title screen with the city behind it', async ({ page }) => {
  // Any script error or blocked resource (including content security policy
  // violations) shows up here and fails the test.
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle("Gang Manager '85");
  await expect(page.getByRole('heading', { name: "Gang Manager '85" })).toBeVisible();
  await expect(page.getByTestId('city-view')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Watch a job' })).toBeEnabled();
  await expect(page.getByText('Browser build')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quit' })).toHaveCount(0);

  expect(problems).toEqual([]);
});
