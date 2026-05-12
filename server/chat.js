const express = require('express');
const RateLimit = require('express-rate-limit');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.CHAT_PORT || 3001;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const TEXTBELT_KEY = process.env.TEXTBELT_KEY || 'textbelt';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'reviews.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    vehicle TEXT DEFAULT '',
    review_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    metadata TEXT,
    ip TEXT,
    ua TEXT,
    referer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_events_event_created ON events(event, created_at)');

app.use(express.json({ limit: '16kb' }));

const apiLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' }
});

app.use('/api/', apiLimiter);

const chatLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat requests. Please wait a minute.' }
});

const reviewsLimiter = RateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many review submissions. Please try later.' }
});

const thanksLimiter = RateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many thank-you texts from this IP. Try later.' }
});

const trackLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests.' }
});

function cleanText(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

const HONEYPOT_FIELDS = ['hp_website', 'website', 'url', 'company_website', '_hp'];

function isHoneypotFilled(body) {
  if (!body || typeof body !== 'object') return false;
  for (const key of HONEYPOT_FIELDS) {
    const value = body[key];
    if (typeof value === 'string' && value.trim().length > 0) return true;
    if (typeof value === 'number' && value !== 0) return true;
  }
  return false;
}

const EVENT_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/;
const META_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_.-]{0,40}$/;
const META_MAX_KEYS = 20;
const META_MAX_STR = 200;
const META_MAX_JSON = 2000;

function sanitizeMetadata(meta) {
  if (meta == null) return null;
  if (typeof meta !== 'object' || Array.isArray(meta)) return null;
  const out = {};
  let count = 0;
  for (const key of Object.keys(meta)) {
    if (count >= META_MAX_KEYS) break;
    if (!META_KEY_RE.test(key)) continue;
    const value = meta[key];
    if (value == null) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, META_MAX_STR);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else {
      continue;
    }
    count++;
  }
  return out;
}

const FAQ = [
  { match: /\b(full detail|both interior)\b.*\b(price|cost|how much)\b|\b(200|225)\b/, resp: 'Full Detail (drop-off): Sedan $200, SUV/Truck $225. Add-ons extra. Text 630-454-1159 to book!' },
  { match: /\bexterior\b.*\b(price|cost|how much)\b|\b(how much)\b.*\bexterior\b/, resp: 'Exterior Detail (drop-off): Sedan $70, SUV/Truck $75. Includes wash, wax, wheels, & tire shine.' },
  { match: /\binterior\b.*\b(price|cost|how much)\b|\b(how much)\b.*\binterior\b/, resp: 'Interior Detail (drop-off): Sedan $140, SUV/Truck $165. Includes vacuum, shampoo, leather clean, & dashboard.' },
  { match: /(add.?on|engine bay|pet hair|odor removal|3rd row)/, resp: 'Add-ons: Engine Bay +$75, Pet Hair Removal +$50, Odor Removal +$125, 3rd Row +$25.' },
  { match: /\b(mobile|upcharge|distance|come to me|pickup|travel fee|extra mile)\b/, resp: 'We prefer drop-offs, but mobile is available for an upcharge: 0-5mi +$30, 5-15mi +$45, 15-25mi +$65. Over 25mi, call for a quote.' },
  { match: /\b(phone|call|text)\b.*\b(number|contact)\b|(630)/, resp: 'Call or text 630-454-1159 to book or ask questions!' },
  { match: /\b(instagram|ig)\b/, resp: 'Follow us on Instagram @tthdetailz for our latest work!' },
  { match: /\b(snapchat|snap)\b/, resp: 'Add us on Snapchat: keon073' },
  { match: /\b(where|location|area)\b/, resp: 'We serve the NW Suburbs of Chicago. Drop-offs preferred; mobile available for extra.' },
  { match: /\b(payment|pay|venmo|zelle|paypal|cash|card)\b/, resp: 'We accept Cash, Card, Venmo, Zelle, and PayPal.' },
  { match: /\b(book|appointment|schedule|reserve)\b/, resp: 'Ready to book? Text or call 630-454-1159 and they will get you set up!' },
  { match: /^(hi|hello|hey|sup|yo|what.up)\b/, resp: 'Welcome to TTH Detailz! We do car detailing in the NW Suburbs of Chicago. Drop-offs preferred. Text 630-454-1159 to book. How can I help?' },
];

const SYSTEM_PROMPT = [
  'You are the TTH Detailz website assistant. Be helpful, brief, and friendly.',
  'Keep responses under 3 sentences.',
  '',
  'BUSINESS: TTH Detailz - car detailing in NW Suburbs of Chicago',
  'Drop-off standard. Mobile upcharge: 0-5mi +$30, 5-15mi +$45, 15-25mi +$65',
  '',
  'PRICING (drop-off):',
  'Exterior: Sedan $70, SUV/Truck $75',
  'Interior: Sedan $140, SUV/Truck $165',
  'Full Detail: Sedan $200, SUV/Truck $225',
  'Add-ons: Engine Bay +$75, Pet Hair +$50, Odor +$125, 3rd Row +$25',
  '',
  'CONTACT: 630-454-1159, IG @tthdetailz, Snap keon073',
  'PAYMENT: Cash, card, Venmo, Zelle, PayPal',
  '',
  'RULES: If someone wants to book, tell them to text or call 630-454-1159.',
].join('\n');

async function callGroq(messages) {
  if (!GROQ_KEY) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 300, temperature: 0.7 })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGemini(msg, history) {
  if (!GEMINI_KEY) return null;
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: (history || []).slice(-10).concat([{ role: 'user', parts: [{ text: msg }] }])
      })
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function findMatch(text) {
  const lower = text.toLowerCase().trim();
  for (const faq of FAQ) {
    if (faq.match.test(lower)) return faq.resp;
  }
  return null;
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    if (isHoneypotFilled(req.body)) {
      console.warn('Chat honeypot triggered from', req.ip);
      return res.status(400).json({ error: 'Invalid request.' });
    }
    const { message, history } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = findMatch(message);
    if (reply) return res.json({ reply });

    if (GROQ_KEY) {
      const msgs = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(history || []).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.parts?.[0]?.text || ''
        })),
        { role: 'user', content: message }
      ];
      const groq = await callGroq(msgs);
      if (groq) return res.json({ reply: groq });
    }

    if (GEMINI_KEY) {
      const gem = await callGemini(message, history);
      if (gem) return res.json({ reply: gem });
    }

    res.json({ reply: 'Text 630-454-1159 and they\'ll help you out!' });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Text 630-454-1159.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, groq: !!GROQ_KEY, gemini: !!GEMINI_KEY }));

app.get('/api/reviews', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, rating, vehicle, review_text, created_at FROM reviews WHERE status = ? ORDER BY created_at DESC').all('approved');
    res.json(rows);
  } catch (err) {
    console.error('Reviews fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load reviews.' });
  }
});

app.post('/api/reviews', reviewsLimiter, (req, res) => {
  try {
    if (isHoneypotFilled(req.body)) {
      console.warn('Reviews honeypot triggered from', req.ip);
      return res.status(400).json({ error: 'Invalid submission.' });
    }
    const { name, rating, vehicle, review_text } = req.body || {};
    const cleanName = cleanText(name, 80);
    const cleanVehicle = cleanText(vehicle, 120);
    const cleanReview = cleanText(review_text, 1200);
    const ratingNum = Number.parseInt(rating, 10);

    if (!cleanName || !cleanReview || Number.isNaN(ratingNum)) {
      return res.status(400).json({ error: 'Name, rating, and review text are required.' });
    }

    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const stmt = db.prepare('INSERT INTO reviews (name, rating, vehicle, review_text) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      cleanName,
      ratingNum,
      cleanVehicle,
      cleanReview
    );

    const TEXTBELT_URL = 'https://textbelt.com/text';
    const OWNER_PHONE = '16304541159';
    const snippet = cleanReview.substring(0, 120);
    fetch(TEXTBELT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: OWNER_PHONE,
        message: `⭐️ New ${ratingNum}-star review from ${cleanName || 'Someone'}! "${snippet}"`,
        key: TEXTBELT_KEY
      })
    }).then(r => r.json()).then(d => {
      console.log('Review SMS:', d.quotaRemaining !== undefined ? `sent (${d.quotaRemaining} left today)` : 'failed - ' + (d.error || 'unknown'));
    }).catch(e => console.error('Review SMS error:', e.message));

    res.json({ id: result.lastInsertRowid, status: 'approved' });
  } catch (err) {
    console.error('Review submit error:', err.message);
    res.status(500).json({ error: 'Failed to save review.' });
  }
});

app.post('/api/thanks', thanksLimiter, async (req, res) => {
  try {
    if (isHoneypotFilled(req.body)) {
      console.warn('Thanks honeypot triggered from', req.ip);
      return res.status(400).json({ error: 'Invalid submission.' });
    }
    const { phone, name } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanName = cleanText(name, 80);
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({ error: 'Phone number format is invalid.' });
    }
    const TEXTBELT_URL = 'https://textbelt.com/text';
    const msg = `Hey${cleanName ? ' ' + cleanName : ''}, thanks for choosing TTH Detailz! Leave a review: https://tthdetailz.autos/reviews.html`;
    const textRes = await fetch(TEXTBELT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, message: msg, key: TEXTBELT_KEY })
    });
    const data = await textRes.json();
    console.log('Thanks SMS:', data.quotaRemaining !== undefined ? `sent (${data.quotaRemaining} left)` : 'failed');
    res.json({ success: data.success, textbelt: { status: data.success ? 'sent' : 'failed', quotaRemaining: data.quotaRemaining } });
  } catch (err) {
    console.error('Thanks SMS error:', err.message);
    res.status(500).json({ error: 'Failed to send thank-you text.' });
  }
});

app.post('/api/track', trackLimiter, (req, res) => {
  try {
    if (isHoneypotFilled(req.body)) {
      console.warn('Track honeypot triggered from', req.ip);
      return res.status(400).json({ error: 'Invalid submission.' });
    }
    const { event } = req.body || {};
    const cleanEvent = cleanText(event, 64);
    if (!cleanEvent || !EVENT_NAME_RE.test(cleanEvent)) {
      return res.status(400).json({ error: 'Invalid event name.' });
    }
    const meta = sanitizeMetadata(req.body && req.body.metadata);
    let metaJson = null;
    if (meta && Object.keys(meta).length > 0) {
      const serialized = JSON.stringify(meta);
      metaJson = serialized.length > META_MAX_JSON ? null : serialized;
    }
    const ip = (req.ip || '').toString().slice(0, 64);
    const ua = (req.get('user-agent') || '').toString().slice(0, 200);
    const referer = (req.get('referer') || '').toString().slice(0, 300);
    db.prepare('INSERT INTO events (event, metadata, ip, ua, referer) VALUES (?, ?, ?, ?, ?)')
      .run(cleanEvent, metaJson, ip, ua, referer);
    res.json({ ok: true });
  } catch (err) {
    console.error('Track error:', err.message);
    res.status(500).json({ error: 'Failed to track event.' });
  }
});

app.use((err, _req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  return next(err);
});

app.listen(PORT, () => console.log('Chat server on port ' + PORT));
