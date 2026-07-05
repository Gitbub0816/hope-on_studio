const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5210/raw_move_test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const fps = await page.evaluate(() => (window).__fpsProbe());
  console.log('Raw moving-images (rotated, boxshadow) FPS:', fps);
  await browser.close();
})();
