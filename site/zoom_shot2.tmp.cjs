const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
  const gallery = page.locator('.block--gallery-flow');
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const frame = gallery.locator('.gallery__frame').first();
  await frame.screenshot({ path: '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/shots/zoom-card.png' });
  const stage = gallery.locator('.gallery__stage');
  await stage.screenshot({ path: '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/shots/zoom-stage-paused.png' });
  await browser.close();
})();
