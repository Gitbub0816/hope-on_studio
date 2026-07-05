const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5210/gallery-test2.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fps = await page.evaluate(() => (window).__fpsProbe());
  console.log('Gallery (10 items, ALL photo, no halftone) FPS:', fps);
  await browser.close();
})();
