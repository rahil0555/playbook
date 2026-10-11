import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './helpers';

// Automated WCAG 2.1 A/AA checks with axe-core on every screen (and a few interactive states).
// Automated tools find roughly a third of accessibility problems; this does not replace screen-reader testing.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function audit(page: import('@playwright/test').Page, label: string) {
  await page.waitForTimeout(400); // let entrance animations settle (axe samples colours)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x e.g. ${v.nodes[0]?.html.slice(0, 140)}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

for (const view of ['home', 'progress', 'alphabet', 'phonics', 'word-builder', 'sentences', 'matching']) {
  test(`axe: ${view}`, async ({ page }) => {
    await page.goto(`/#/${view}`);
    await audit(page, view);
  });
}

test('axe: states (selected letter, quiz question, game board, wrong answer, summary, settings)', async ({ page }) => {
  await page.goto('/#/alphabet');
  await page.locator('[data-letter="b"]').click();
  await audit(page, 'alphabet selected');

  await page.goto('/#/phonics');
  await page.getByRole('tab', { name: 'Listen & choose' }).click();
  await page.locator('[data-choice]').first().waitFor();
  await audit(page, 'phonics quiz');
  await page.locator('[data-choice]').first().click();
  await audit(page, 'phonics after first pick');

  await page.goto('/#/matching');
  await page.locator('[data-game="letter-picture"]').click();
  await page.locator('[data-side="left"]').first().waitFor();
  await audit(page, 'matching board');
  await page.locator('[data-side="left"]').first().click();
  await audit(page, 'matching card selected');

  await page.goto('/#/word-builder');
  await page.locator('[data-magic-tile]').first().waitFor();
  await audit(page, 'magic letters start');
  await page.locator('[data-magic-tile]').first().click();
  await audit(page, 'magic letters letter picked up');
  await page.locator('[data-magic-slot]').first().click();
  await audit(page, 'magic letters after a drop');

  await page.getByRole('button', { name: 'Settings' }).click();
  await audit(page, 'settings open');
});
