const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());

const HANDLE = process.argv[2] || 'tthdetailz';
const TARGET = `https://www.instagram.com/${HANDLE}/`;
const MAX = parseInt(process.argv[3] || '24', 10);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    await page.goto(TARGET, { waitUntil: 'networkidle2', timeout: 45000 });

    // Try to dismiss any login prompt overlays
    await page.evaluate(() => {
      document.querySelectorAll('div[role="dialog"]').forEach(d => d.remove());
      document.body.style.overflow = 'auto';
    });

    // Scroll a bit to trigger lazy load
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await new Promise(r => setTimeout(r, 1200));
    }

    const data = await page.evaluate(() => {
      const seen = new Set();
      const out = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const m = a.getAttribute('href').match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?/);
        if (!m) return;
        const url = `https://www.instagram.com/${m[1]}/${m[2]}/`;
        if (seen.has(url)) return;
        seen.add(url);
        const img = a.querySelector('img');
        out.push({
          url, type: m[1],
          alt: img ? (img.getAttribute('alt') || '') : '',
          thumb: img ? (img.getAttribute('src') || '') : ''
        });
      });
      // Fallback: scan ALL hrefs in entire HTML for /p/ or /reel/ shortcodes
      const html = document.documentElement.outerHTML;
      const re = /\/(p|reel)\/([A-Za-z0-9_-]{6,})\/?/g;
      let m;
      while ((m = re.exec(html))) {
        const url = `https://www.instagram.com/${m[1]}/${m[2]}/`;
        if (!seen.has(url)) { seen.add(url); out.push({ url, type: m[1], alt: '', thumb: '' }); }
      }
      const title = document.title;
      const meta = document.querySelector('meta[property="og:description"]');
      const loginGate = !!document.querySelector('input[name="username"], a[href*="/accounts/login"]');
      return { posts: out, title, og: meta ? meta.getAttribute('content') : '', loginGate };
    });

    require('fs').writeFileSync('/tmp/ig-debug.html', await page.content());

    console.log(JSON.stringify({
      handle: HANDLE,
      title: data.title,
      og: data.og,
      count: data.posts.length,
      posts: data.posts.slice(0, MAX)
    }, null, 2));
  } catch (e) {
    console.error('SCRAPE_ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
