// TTH Detailz AI Chat Widget
(function() {
  const API_URL = '/api/chat';

  // Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/chat-widget.css';
  document.head.appendChild(link);

  // Widget HTML
  const container = document.createElement('div');
  container.id = 'tth-chat';
  container.innerHTML = `
    <button id="tth-chat-open" aria-label="Open chat" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <div id="tth-chat-box" hidden>
      <div id="tth-chat-header">
        <span>TTH Detailz</span>
        <button id="tth-chat-close" aria-label="Close chat" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="tth-chat-msgs">
        <div class="tth-msg tth-bot">
          Hey 👋 I'm the TTH Detailz assistant. Ask me about pricing, services, or booking — or just hit "Call" or "Text" below to talk to the team directly.
        </div>
      </div>
      <div id="tth-chat-input-row">
        <input type="text" id="tth-chat-input" placeholder="Ask anything..." autocomplete="off">
        <button id="tth-chat-send" aria-label="Send" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div id="tth-chat-footer">
        <a href="tel:+16304541159" class="tth-chat-action">📞 Call</a>
        <a href="sms:+16304541159" class="tth-chat-action">💬 Text</a>
        <a href="https://instagram.com/tthdetailz" target="_blank" class="tth-chat-action">📸 IG DM</a>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const openBtn = document.getElementById('tth-chat-open');
  const closeBtn = document.getElementById('tth-chat-close');
  const box = document.getElementById('tth-chat-box');
  const input = document.getElementById('tth-chat-input');
  const sendBtn = document.getElementById('tth-chat-send');
  const msgsEl = document.getElementById('tth-chat-msgs');
  let history = [];
  let loading = false;

  // Force initial states (CSS display:flex overrides HTML hidden attribute)
  box.style.display = 'none';
  openBtn.style.display = 'flex';

  openBtn.addEventListener('click', () => {
    box.style.display = 'flex';
    openBtn.style.display = 'none';
    input.focus();
    setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 100);
  });

  closeBtn.addEventListener('click', () => {
    box.style.display = 'none';
    openBtn.style.display = 'flex';
  });

  function addMsg(text, role) {
    const div = document.createElement('div');
    div.className = `tth-msg tth-${role}`;
    div.textContent = text;
    msgsEl.appendChild(div);
    setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 50);
  }

  async function send() {
    const msg = input.value.trim();
    if (!msg || loading) return;

    input.value = '';
    addMsg(msg, 'user');
    history.push({ role: 'user', parts: [{ text: msg }] });

    loading = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="tth-dot-pulse"></span>';

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history })
      });
      const data = await res.json();
      if (data.reply) {
        addMsg(data.reply, 'bot');
        history.push({ role: 'model', parts: [{ text: data.reply }] });
      } else {
        addMsg('Hmm, I couldn\'t process that. Text 630-454-1159 directly for help 👍', 'bot');
      }
    } catch {
      addMsg('Chat service temporarily unavailable. Text 630-454-1159 directly 👍', 'bot');
    }

    loading = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    input.focus();
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
})();
