const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const outDir = '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/shots';

  // --- Desktop, normal motion ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
    const gallery = page.locator('.block--gallery-flow');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await gallery.screenshot({ path: `${outDir}/01-desktop-t0.png` });

    // FPS measurement over ~2.5s while mid-travel
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
    console.log('FPS desktop mid-travel:', fps.toFixed(1));

    await page.waitForTimeout(1200);
    await gallery.screenshot({ path: `${outDir}/02-desktop-t1.png` });
    await page.waitForTimeout(1800);
    await gallery.screenshot({ path: `${outDir}/03-desktop-t2.png` });

    // hover test
    const frame = gallery.locator('.gallery__frame').first();
    await frame.hover();
    await page.waitForTimeout(500);
    await gallery.screenshot({ path: `${outDir}/04-desktop-hover.png` });

    await page.close();
  }

  // --- Desktop, reduced motion ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
    const gallery = page.locator('.block--gallery-flow');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await gallery.screenshot({ path: `${outDir}/05-desktop-reduced.png` });
    await page.waitForTimeout(1500);
    await gallery.screenshot({ path: `${outDir}/06-desktop-reduced-later.png` });
    await page.close();
  }

  // --- Mobile ---
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
    const gallery = page.locator('.block--gallery-flow');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await gallery.screenshot({ path: `${outDir}/07-mobile-t0.png` });
    await page.waitForTimeout(1200);
    await gallery.screenshot({ path: `${outDir}/08-mobile-t1.png` });
    await page.close();
  }

  await browser.close();
})();
