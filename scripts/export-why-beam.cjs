const path = require('path');
const crypto = require('crypto');
require('@next/env').loadEnvConfig(process.cwd());
const { chromium } = require('C:/Users/Jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const secret = process.env.BEAM_SITE_LOCK_SECRET || process.env.BEAM_BACKUP_ENCRYPTION_KEY;
  if (!secret) throw new Error('Local site access is not configured');
  const expiry = String(Math.floor(Date.now() / 1000) + 3600);
  const signature = crypto.createHmac('sha256', secret).update(`beam-site-access:v1:${expiry}`).digest('hex');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.context().addCookies([{ name: 'beam-site-access', value: `${expiry}.${signature}`, url: 'http://localhost:3002' }]);
    await page.goto('http://localhost:3002/social/why-beam?native=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log('Artwork loaded');
    await page.locator('.why-beam-canvas').waitFor();
    await page.evaluate(() => document.fonts.ready);
    console.log('Fonts loaded');
    await page.locator('.why-beam-canvas img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const artwork = page.locator('.why-beam-canvas');
    await artwork.screenshot({ path: 'output/social/beam-why-we-made-it.png' });
    console.log('Exported ' + path.resolve('output/social/beam-why-we-made-it.png'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
