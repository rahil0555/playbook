import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// Two separate brand images. The browser-tab icon and the in-app header logo each use their own file, and each is checked here.
// Both show the graduation cap on a transparent background: the teal is removed, the cap keeps its own colours, and no solid teal,
// white or grey remains around it.

const TEAL = [22, 162, 135];

/** Reads every pixel of an image served by the app, through a canvas, and reports its edges, its cap and any leftover teal. */
async function readIcon(page: Page, src: string) {
  return page.evaluate(
    async ({ url, teal }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const px = (x: number, y: number) => Array.from(data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
      const edge: number[][] = [];
      for (let x = 0; x < img.width; x++) edge.push(px(x, 0), px(x, img.height - 1));
      for (let y = 0; y < img.height; y++) edge.push(px(0, y), px(img.width - 1, y));
      const pixels = Array.from({ length: data.length / 4 }, (_, i) => Array.from(data.slice(i * 4, i * 4 + 4)));
      const solid = pixels.filter((p) => p[3] >= 128);
      // solid pixels that are close to the brand teal: any such pixel is background that was not removed
      const nearTeal = solid.filter((p) => Math.hypot(p[0] - teal[0], p[1] - teal[1], p[2] - teal[2]) < 60).length;
      // the cap is blue-grey and orange; it has solid pixels that are neither teal nor white
      const cap = solid.filter((p) => p[2] > p[1] && p[1] > 60 && p[0] < 240 && Math.hypot(p[0] - teal[0], p[1] - teal[1], p[2] - teal[2]) >= 60).length;
      return { width: img.width, height: img.height, edge, nearTeal, cap };
    },
    { url: src, teal: TEAL },
  );
}

test('the browser-tab favicon is the cap on a transparent background, with no teal or white left around it', async ({ page }) => {
  await page.goto('/#/');
  const icon = await readIcon(page, '/favicon.png');
  expect(icon.width).toBe(32);
  expect(icon.height).toBe(32);
  const edgeVisible = icon.edge.filter((p) => p[3] > 0);
  expect(edgeVisible, 'every edge pixel is see-through').toEqual([]);
  expect(icon.nearTeal, 'no solid teal is left behind the cap').toBe(0);
  expect(icon.cap, 'the cap is still there').toBeGreaterThan(100);
});

test('the in-app header logo is the cap on a transparent background, with no teal or white left around it', async ({ page }) => {
  await page.goto('/#/');
  const src = await page.locator('img[src*="edurance-graduation-cap"]').first().getAttribute('src');
  expect(src).toBeTruthy();
  const logo = await readIcon(page, src!);
  const edgeVisible = logo.edge.filter((p) => p[3] > 0);
  expect(edgeVisible, 'every edge pixel is see-through').toEqual([]);
  expect(logo.nearTeal, 'no solid teal is left behind the cap').toBe(0);
  expect(logo.cap, 'the cap is still there').toBeGreaterThan(1000);
});
