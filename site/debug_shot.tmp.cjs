const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
  page.on('requestfailed', (req) => console.log('REQFAIL:', req.url(), req.failure()?.errorText));
  await page.goto('http://localhost:5210/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const html = await page.content();
  require('fs').writeFileSync('/tmp/claude-0/-home-user-hope-on-studio/1972b2f3-ba20-53a6-b01a-70294d69888c/scratchpad/page.html', html);
  const blocks = await page.evaluate(() => Array.from(document.querySelectorAll('[data-block-type]')).map(b => b.dataset.blockType));
  console.log('BLOCKS:', blocks);
  await browser.close();
})();
