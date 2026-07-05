import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2800);
await page.evaluate(async () => {
  const el = document.querySelector('[data-block-type="outlet-triptych"]');
  const target = el.getBoundingClientRect().top + scrollY - 120;
  let guard = 0;
  while (Math.abs(scrollY - target) > 60 && guard++ < 400) {
    dispatchEvent(new WheelEvent('wheel', { deltaY: Math.sign(target - scrollY) * 420, bubbles: true }));
    await new Promise(r => setTimeout(r, 16));
  }
});
await page.waitForTimeout(1800);
await page.screenshot({ path: process.env.OUT + '/triptych-fixed.jpg', quality: 75, type: 'jpeg' });
// hover the middle panel
await page.hover('.triptych__panel:nth-child(2)');
await page.waitForTimeout(1200);
await page.screenshot({ path: process.env.OUT + '/triptych-hover.jpg', quality: 75, type: 'jpeg' });
await browser.close();
