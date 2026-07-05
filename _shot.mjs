import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad';
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const positions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${vp.name}] PAGEERROR ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  for (const p of positions) {
    await page.evaluate((frac) => { const h = document.body.scrollHeight - window.innerHeight; window.scrollTo(0, h * frac); }, p);
    await page.waitForTimeout(750);
    const pct = String(Math.round(p * 100)).padStart(3, '0');
    await page.screenshot({ path: `${OUT}/${vp.name}-${pct}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log('ERRORS:', errors.length);
errors.forEach((e) => console.log(e));
