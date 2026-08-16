import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'pwa');
mkdirSync(out, { recursive: true });

const mime = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname).replace(/^\//, '');
  const file = join(root, rel);
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end('missing');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const logoUrl = `http://127.0.0.1:${port}/assets/logo.svg`;
const fallback = `http://127.0.0.1:${port}/assets/cover.svg`;

const browser = await chromium.launch({ headless: true });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const img = Math.round(size * 0.82);
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;background:#12100c;width:${size}px;height:${size}px;display:grid;place-items:center">
<img id="i" src="${logoUrl}" width="${img}" height="${img}" alt=""/>
<script>document.getElementById('i').onerror=function(){this.onerror=null;this.src='${fallback}'}</script>
</body></html>`,
    { waitUntil: 'networkidle' }
  );
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(out, `icon-${size}.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log(
  'icons',
  readFileSync(join(out, 'icon-192.png')).length,
  readFileSync(join(out, 'icon-512.png')).length
);
