import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const [slug, positions] of [['publishing',[0,40,80]],['photography',[30,60]],['learning-design',[35,70]]]) {
  await page.goto(`http://127.0.0.1:5173/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  for (const p of positions) {
    await page.evaluate(async (pct) => {
      const target = (document.body.scrollHeight - innerHeight) * pct / 100;
      let cur = scrollY;
      while (Math.abs(cur - target) > 40) {
        const step = Math.sign(target - cur) * 400;
        dispatchEvent(new WheelEvent('wheel', { deltaY: step, bubbles: true }));
        await new Promise(r => setTimeout(r, 30));
        cur += step;
      }
    }, p);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: process.env.OUT + `/${slug}-${p}.jpg`, quality: 70, type: 'jpeg' });
  }
}
await browser.close();
