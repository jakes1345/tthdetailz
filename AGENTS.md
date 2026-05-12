## Learned User Preferences
- Prefers direct, action-first help that executes requested changes end-to-end.
- Prefers interactive visual iteration for UI work (run locally, review appearance, then tweak).
- Prefers concise, practical communication in a casual tone.

## Learned Workspace Facts
- The main website is a static frontend built from `public/index.html`, `public/styles.css`, and `public/script.js`.
- The repo uses `server.js` for local static serving and `server/chat.js` for chat/review API behavior.
- Site images and social/gallery media are stored under `public/media/`.
- `public/track.js` posts optional first-party analytics to `POST /api/track` (SQLite `events` table). Forms include honeypot fields aligned with `server/chat.js`.
