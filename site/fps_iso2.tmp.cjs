const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR', m.text()); });
  await page.goto('http://localhost:5210/gallery-test.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/shots/iso-test-t0.png', fullPage: true });
  const fps = await page.evaluate(() => (window).__fpsProbe());
  console.log('Isolated gallery-only (10 items) FPS buckets:', fps);
  await browser.close();
})();
