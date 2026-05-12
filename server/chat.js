const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();

const PORT = process.env.CHAT_PORT || 3001;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error('Missing GEMINI_API_KEY env var');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  systemInstruction: `You are the TTH Detailz website assistant. Be helpful, brief, and friendly. Use emojis sparingly. Keep responses under 4 sentences if possible.

BUSINESS INFO:
- Name: TTH Detailz (car detailing)
- Location: Northwest Suburbs of Chicago (Schaumburg, Palatine, Arlington Heights, Hoffman Estates area)
- Drop-off is standard. Address sent after booking.
- Mobile available with distance upcharge: 0-5mi +$30, 5-15mi +$45, 15-25mi +$65, 25+ miles call for quote

PRICING (drop-off):
- Exterior Detail: Sedan $70, SUV/Truck $75
- Interior Detail: Sedan $140, SUV/Truck $165
- Full Detail (interior+exterior): Sedan $200, SUV/Truck $225
- Add-ons: Engine Bay +$75, Pet Hair +$50, Odor Removal +$125, 3rd Row +$25

CONTACT:
- Call/Text: 630-454-1159
- Instagram: @tthdetailz
- Snapchat: keon073
- Same-day appointments when available
- Payment: Cash, card, Venmo, Zelle, PayPal

RULES:
- If someone wants to book, tell them to text or call 630-454-1159 or DM @tthdetailz on Instagram
- If you don't know something, say "I'm not sure — text 630-454-1159 and they'll sort you out"
- Never make up pricing. Only use the prices listed above.
- Be chill and conversational, like a friendly shop employee`
});

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chat = model.startChat({
      history: (history || []).slice(-10) // keep last 10 exchanges
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Try texting 630-454-1159 directly.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});
