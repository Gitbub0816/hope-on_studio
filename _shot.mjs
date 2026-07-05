import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForSelector('#canvas [data-block-id]', { timeout: 8000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/01-initial.png` });

const blocks = await page.$$('#canvas [data-block-id]');
console.log('block count:', blocks.length);
await blocks[1].click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-selected.png` });

const triptych = await page.$('[data-block-type="outlet-triptych"]');
if (triptych) {
  await triptych.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-triptych-inspector.png` });
}

await page.evaluate(() => document.querySelector('.adder__pill')?.click());
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-palette.png` });
await page.keyboard.press('Escape');

await page.evaluate(() => document.querySelector('.top__history')?.click());
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/05-revisions.png` });
await page.keyboard.press('Escape');

await browser.close();
console.log('done');
