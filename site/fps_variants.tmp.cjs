const { chromium } = require('playwright');

async function measure(page, url, cssOverride) {
  await page.goto(url, { waitUntil: 'networkidle' });
  if (cssOverride) await page.addStyleTag({ content: cssOverride });
  await page.waitForTimeout(1200);
  return page.evaluate(() => (window).__fpsProbe());
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('A) baseline (full, with halftone):', await measure(page, 'http://localhost:5210/gallery-test.html'));
  console.log('B) no box-shadow override:', await measure(page, 'http://localhost:5210/gallery-test.html', '.gallery__frame{box-shadow:none !important;}'));
  console.log('C) no border-radius/overflow-clip on frame:', await measure(page, 'http://localhost:5210/gallery-test.html', '.gallery__frame{overflow:visible !important; border-radius:0 !important; box-shadow:none !important;}'));
  console.log('D) band not rotated:', await measure(page, 'http://localhost:5210/gallery-test.html', '.gallery__band{transform:none !important;}'));
  console.log('E) single lane only (hide 2nd lane):', await measure(page, 'http://localhost:5210/gallery-test.html', '.gallery__lane--1{display:none !important;}'));

  await browser.close();
})();
