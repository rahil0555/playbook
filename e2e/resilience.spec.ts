import { expect, test } from '@playwright/test';

// A screen whose code cannot be downloaded (flaky school Wi-Fi, an interrupted update) must not leave a blank or stuck page.
// These tests deliberately break one lazily loaded screen, so they use the plain test (no console-error gate).

test('a screen whose code will not load shows a kind message and a way home', async ({ page }) => {
  await page.route('**/SentenceBuilderActivity*.js', (route) => route.abort());
  await page.goto('/#/sentences');
  await expect(page.getByRole('button', { name: /Home|Try again/ }).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/couldn.t open|went wrong|try again/i).first()).toBeVisible();
});

test('after such a failure, the child can still get back to Home', async ({ page }) => {
  await page.route('**/SentenceBuilderActivity*.js', (route) => route.abort());
  await page.goto('/#/sentences');
  await page.waitForTimeout(800);
  await page.unroute('**/SentenceBuilderActivity*.js');
  await page.getByRole('button', { name: /Home|Try again/ }).first().click({ timeout: 8000 });
  await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible({ timeout: 8000 });
});
