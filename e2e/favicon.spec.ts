import { expect, test } from './helpers';

// The tab icon is the graduation cap on a transparent background. The teal square it used to sit on is gone, and the cap's own
// pixels are unchanged (the same colour at the same place), so the cap reads on any browser tab colour.

test('the favicon is the cap on a transparent background, with no teal left behind', async ({ page }) => {
  await page.goto('/#/');
  const icon = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/favicon.png';
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, img.width, img.height);
    const pixel = (x: number, y: number) => Array.from(data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
    let opaqueTeal = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && Math.hypot(data[i] - 22, data[i + 1] - 162, data[i + 2] - 135) < 40) opaqueTeal += 1;
    }
    return {
      size: [img.width, img.height],
      corners: [pixel(0, 0), pixel(img.width - 1, 0), pixel(0, img.height - 1), pixel(img.width - 1, img.height - 1)].map((p) => p[3]),
      logo: pixel(16, 12),
      opaqueTeal,
    };
  });
  expect(icon.size).toEqual([32, 32]);
  expect(icon.corners, 'the corners are see-through').toEqual([0, 0, 0, 0]);
  expect(icon.logo, 'the cap keeps its colour').toEqual([100, 119, 152, 255]);
  expect(icon.opaqueTeal, 'no teal background is left opaque').toBe(0);
});
