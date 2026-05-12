const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());

const POSTS = [
  'https://www.instagram.com/p/DWO9pjxgJs6/',
  'https://www.instagram.com/reel/DWOGaFNDoOX/',
  'https://www.instagram.com/p/DWOCTg-jnbq/',
  'https://www.instagram.com/p/DWOAiOQjro3/',
  'https://www.instagram.com/p/DWN_lL5Du15/',
  'https://www.instagram.com/p/DWN--tqjuWL/',
  'https://www.instagram.com/p/DWN-WTODgNK/',
  'https://www.instagram.com/reel/DWN9YRRjq8v/',
  'https://www.instagram.com/p/DWN8g-SDrld/',
  'https://www.instagram.com/p/DVCTO8gjyDk/',
  'https://www.instagram.com/p/DVCS4TWD1ZE/'
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const out = [];
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
    for (const url of POSTS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 1200));
        const cap = await page.evaluate(() => {
          const og = document.querySelector('meta[property="og:title"]');
          const desc = document.querySelector('meta[name="description"]');
          return {
            og: og ? og.getAttribute('content') : '',
            desc: desc ? desc.getAttribute('content') : ''
          };
        });
        out.push({ url, ...cap });
      } catch (e) { out.push({ url, error: e.message }); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(out, null, 2));
})();
