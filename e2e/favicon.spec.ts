import { expect, test } from './helpers';

// Two separate brand images. The browser-tab icon and the in-app header logo each use their own file, and each is checked here.
// Both keep the graduation cap exactly as drawn, on a solid Edurance teal square, with no white or grey edge.

const TEAL = [22, 162, 135, 255];

/** Reads every pixel of an image served by the app, through a canvas, and reports the edges and one pixel of the cap. */
async function readIcon(page: import('@playwright/test').Page, src: string) {
  return page.evaluate(async (url) => {
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
    const seeThrough = Array.from({ length: data.length / 4 }, (_, i) => data[i * 4 + 3]).filter((a) => a < 255).length;
    return { width: img.width, height: img.height, seeThrough, edge, cap: px(Math.floor(img.width / 2), Math.floor(img.height * 0.4)) };
  }, src);
}

test('the browser-tab favicon is the cap on a solid Edurance teal square, with no white edge', async ({ page }) => {
  await page.goto('/#/');
  const icon = await readIcon(page, '/favicon.png');
  expect(icon.width).toBe(32);
  expect(icon.height).toBe(32);
  expect(icon.seeThrough, 'the square is solid').toBe(0);
  const offTeal = icon.edge.filter((p) => p.join() !== TEAL.join());
  expect(offTeal, 'every edge pixel is the brand teal').toEqual([]);
});

test('the in-app header logo is the cap on a solid Edurance teal square, with no grey or white edge', async ({ page }) => {
  await page.goto('/#/');
  const src = await page.locator('img[src*="edurance-graduation-cap"]').first().getAttribute('src');
  expect(src).toBeTruthy();
  const logo = await readIcon(page, src!);
  expect(logo.seeThrough, 'the square is solid').toBe(0);
  const offTeal = logo.edge.filter((p) => p.join() !== TEAL.join());
  // two pixels along the bottom edge are a darker teal shadow of the artwork itself; nothing else may differ
  expect(offTeal.length, 'at most the two shadow pixels differ from the brand teal').toBeLessThanOrEqual(2);
  expect(offTeal.every((p) => p[0] < 100 && p[1] > 140), 'what differs is teal, not white or grey').toBe(true);
});
