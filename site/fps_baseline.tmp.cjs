const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('about:blank');
  const fps = await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    function tick() {
      frames++;
      if (performance.now() - start < 2500) requestAnimationFrame(tick);
      else resolve(frames / ((performance.now() - start) / 1000));
    }
    requestAnimationFrame(tick);
  }));
  console.log('Baseline blank-page FPS:', fps.toFixed(1));
  await browser.close();
})();
