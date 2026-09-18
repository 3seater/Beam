const path = require('path');
const { chromium } = require('C:/Users/Jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3002/social/stock-selection?native=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log('Artwork loaded');
    await page.locator('.stock-selection-canvas').waitFor();
    await page.evaluate(() => document.fonts.ready);
    console.log('Fonts loaded');
    await page.locator('.stock-selection-tile img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const artwork = page.locator('.stock-selection-canvas');
    await artwork.screenshot({ path: 'output/social/beam-stocks-and-crypto.png' });
    console.log('Exported ' + path.resolve('output/social/beam-stocks-and-crypto.png'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
