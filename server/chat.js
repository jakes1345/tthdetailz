const express = require('express');
const RateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.CHAT_PORT || 3001;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

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

app.use(express.json());

const apiLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' }
});

app.use('/api/', apiLimiter);

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

app.post('/api/chat', async (req, res) => {
  try {
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

app.post('/api/reviews', (req, res) => {
  try {
    const { name, rating, vehicle, review_text } = req.body || {};
    if (!name || !rating || !review_text) {
      return res.status(400).json({ error: 'Name, rating, and review text are required.' });
    }
    const stmt = db.prepare('INSERT INTO reviews (name, rating, vehicle, review_text) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      name.trim(),
      Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
      (vehicle || '').trim(),
      review_text.trim()
    );
    res.json({ id: result.lastInsertRowid, status: 'approved' });
  } catch (err) {
    console.error('Review submit error:', err.message);
    res.status(500).json({ error: 'Failed to save review.' });
  }
});

app.listen(PORT, () => console.log('Chat server on port ' + PORT));
