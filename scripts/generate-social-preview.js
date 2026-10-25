const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

async function generate() {
  const assets = path.join(__dirname, 'assets');
  const output = path.join(__dirname, '../apps/web/public');
  const logo = await fs.readFile(path.join(assets, 'social-brand-mark.svg'));
  const source = (await fs.readFile(path.join(assets, 'facebook-share.svg'), 'utf8'))
    .replace('href="social-brand-mark.svg"', `href="data:image/svg+xml;base64,${logo.toString('base64')}"`);
  const target = path.join(output, 'og-image-2026.png');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'zeroone-social-'));
  try {
    const sourcePath = path.join(temporary, 'preview.svg');
    await fs.writeFile(sourcePath, source);
    const browser = process.env.BROWSER_BIN || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
    execFileSync(browser, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      '--disable-background-networking', '--disable-extensions', '--disable-sync', '--disable-component-update',
      '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=1000',
      `--user-data-dir=${path.join(temporary, 'browser')}`, `--screenshot=${target}`, pathToFileURL(sourcePath).href], { stdio: 'pipe' });
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
  // Keep older direct image URLs working too.
  await fs.copyFile(target, path.join(output, 'og-image.png'));
  console.log('Generated Facebook/social preview: 1200 × 630.');
}

generate().catch((error) => { console.error(error.message); process.exitCode = 1; });
