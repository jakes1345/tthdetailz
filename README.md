# TTH Detailz

Car detailing business website — Northwest Suburbs of Chicago.

📞 **630-454-1159** · 📸 [@tthdetailz](https://instagram.com/tthdetailz) · 👻 [keon073](https://snapchat.com/add/keon073)

## Live Site

🌐 [tthdetailz.autos](https://tthdetailz.autos)

## Local Dev

```bash
npm install
npm start
# → http://localhost:5001
```

## Deploy

**Production:** VPS + nginx serves files from `/var/www/tthdetailz` (same contents as `public/`). Same-origin **`/api/*`** routes proxy to Node **`server/chat.js`** (reviews, chat, lightweight analytics). Restart the Node process after backend changes.

**Local static preview:** `npm start` → `server.js` serves `public/` only (no `/api` unless you run the chat server separately).

Optional: mirror **static** assets on Cloudflare Pages (`public` as output, no build step). The chat/review/API features still require the Node backend reachable at **`/api`** on your live domain (or adjust URLs).
