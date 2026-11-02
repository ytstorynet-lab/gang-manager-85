import { _electron as electron, expect, test } from '@playwright/test';

// Launches the packaged Windows game. CI sets GM85_EXE after building it.
test('the desktop build opens on the title screen', async () => {
  const executablePath = process.env['GM85_EXE'];
  test.skip(!executablePath, 'Set GM85_EXE to the packaged game to run this test');

  const app = await electron.launch({
    executablePath: executablePath as string,
    // Linux test machines often run as root, where Chromium's sandbox can't start.
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
  });
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle("Gang Manager '85");
    await expect(window.getByRole('heading', { name: "Gang Manager '85" })).toBeVisible();
    await expect(window.getByTestId('city-view')).toHaveAttribute('data-ready', 'true');
    await expect(window.getByText('Desktop build')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Quit' })).toBeVisible();
  } finally {
    await app.close();
  }
});
