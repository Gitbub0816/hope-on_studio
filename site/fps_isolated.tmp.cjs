const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
  const gallery = page.locator('.block--gallery-flow');
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  // Hide everything except the gallery block (and keep it in place) to isolate its cost.
  await page.evaluate(() => {
    document.querySelectorAll('body > *').forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
    });
    document.querySelectorAll('.block').forEach((n) => {
      if (!n.classList.contains('block--gallery-flow')) {
        (n).style.display = 'none';
      }
    });
    document.querySelectorAll('.chrome-vines, [class*="chrome"]').forEach((n) => {
      if (n instanceof HTMLElement && !n.closest('.block--gallery-flow')) n.style.display = 'none';
    });
  });
  await page.waitForTimeout(500);

  const buckets = await page.evaluate(() => new Promise((resolve) => {
    const results = [];
    let bucketStart = performance.now();
    let frames = 0;
    const totalDuration = 4000;
    const overallStart = performance.now();
    function tick() {
      frames++;
      const now = performance.now();
      if (now - bucketStart >= 1000) {
        results.push(+(frames / ((now - bucketStart) / 1000)).toFixed(1));
        frames = 0;
        bucketStart = now;
      }
      if (now - overallStart < totalDuration) requestAnimationFrame(tick);
      else resolve(results);
    }
    requestAnimationFrame(tick);
  }));
  console.log('Isolated gallery-only FPS buckets:', buckets);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/shots/isolated-check.png' });
  await browser.close();
})();
