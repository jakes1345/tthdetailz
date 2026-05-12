const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const https = require('https');
const path = require('path');
puppeteer.use(Stealth());

const POSTS = [
  ['photo1.jpg',  'https://www.instagram.com/p/DWO9pjxgJs6/'],
  ['photo2.jpg',  'https://www.instagram.com/reel/DWOGaFNDoOX/'],
  ['photo3.jpg',  'https://www.instagram.com/p/DWOCTg-jnbq/'],
  ['photo4.jpg',  'https://www.instagram.com/p/DWOAiOQjro3/'],
  ['photo5.jpg',  'https://www.instagram.com/p/DWN_lL5Du15/'],
  ['photo6.jpg',  'https://www.instagram.com/p/DWN--tqjuWL/'],
  ['photo7.jpg',  'https://www.instagram.com/p/DWN-WTODgNK/'],
  ['photo8.jpg',  'https://www.instagram.com/reel/DWN9YRRjq8v/'],
  ['photo9.jpg',  'https://www.instagram.com/p/DWN8g-SDrld/'],
  ['photo10.jpg', 'https://www.instagram.com/p/DVCTO8gjyDk/'],
  ['photo11.jpg', 'https://www.instagram.com/p/DVCS4TWD1ZE/']
];

const OUT_DIR = path.join(__dirname, 'public', 'media', 'images');

function dl(url, file) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(file);
    https.get(url, r => {
      if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode));
      r.pipe(f);
      f.on('finish', () => f.close(() => res()));
    }).on('error', rej);
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1600 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

    for (const [name, url] of POSTS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 1500));
        const imgUrl = await page.evaluate(() => {
          const og = document.querySelector('meta[property="og:image"]');
          if (og) return og.getAttribute('content');
          const v = document.querySelector('meta[property="og:video"]');
          if (v) return v.getAttribute('content');
          return null;
        });
        if (!imgUrl) { console.log(name, 'NO IMG'); continue; }
        const out = path.join(OUT_DIR, name);
        const backup = out + '.orig';
        if (fs.existsSync(out) && !fs.existsSync(backup)) fs.copyFileSync(out, backup);
        await dl(imgUrl, out);
        const sz = fs.statSync(out).size;
        console.log(name, 'OK', (sz/1024).toFixed(1)+'KB', '<-', imgUrl.substring(0, 80));
      } catch (e) {
        console.log(name, 'ERR', e.message);
      }
    }
  } finally {
    await browser.close();
  }
})();
