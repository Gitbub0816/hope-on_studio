const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
  const gallery = page.locator('.block--gallery-flow');
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000); // let particle fields build + tweens settle

  const buckets = await page.evaluate(() => new Promise((resolve) => {
    const results = [];
    let bucketStart = performance.now();
    let frames = 0;
    const totalDuration = 6000;
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
  console.log('Per-second FPS buckets (gallery mid-travel):', buckets);
  await browser.close();
})();
