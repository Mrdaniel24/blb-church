/**
 * BLB Church — Floating Chat Widget
 * Features: AI assistant (Groq), quick actions, Google Maps navigation, Bolt, contacts.
 * Self-contained: injects its own styles and DOM elements.
 */
(function () {
  'use strict';

  const FUNCTION_URL = 'https://vscjivuatnchqwtcgggn.supabase.co/functions/v1/church-chat-v2';
  const REST_URL     = 'https://vscjivuatnchqwtcgggn.supabase.co/rest/v1';
  const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY2ppdnVhdG5jaHF3dGNnZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTk0OTMsImV4cCI6MjA5MDY5NTQ5M30.AwLLf--l1BWXU7p7OPCJ28y5dxL7g90QSxFrnhe6Iq8';

  const REST_HEADERS = {
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY,
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const CSS = `
    #blb-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #fed01b; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,35,111,0.35);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #blb-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,35,111,0.45); }
    #blb-chat-btn .material-symbols-outlined {
      font-size: 26px; color: #00236f; font-variation-settings: 'FILL' 1;
    }
    #blb-chat-badge {
      position: absolute; top: -3px; right: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #ef4444; border: 2px solid #fff; display: none;
    }
    #blb-chat-btn.has-msg #blb-chat-badge { display: block; }
    #blb-chat-panel {
      position: fixed; bottom: 90px; right: 24px; z-index: 9998;
      width: 360px; max-width: calc(100vw - 32px);
      height: 540px; max-height: calc(100vh - 110px);
      background: #fff; border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0,35,111,0.22);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(0.88) translateY(16px); opacity: 0;
      transform-origin: bottom right;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
      pointer-events: none;
    }
    #blb-chat-panel.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    .blb-hdr {
      background: #00236f; padding: 14px 16px;
      display: flex; align-items: center; gap: 11px; flex-shrink: 0;
    }
    .blb-hdr-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: #fed01b; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .blb-hdr-avatar .material-symbols-outlined {
      font-size: 20px; color: #00236f; font-variation-settings: 'FILL' 1;
    }
    .blb-hdr-info { flex: 1; min-width: 0; }
    .blb-hdr-title {
      font-family: 'Inter', sans-serif; font-size: 0.9rem;
      font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.01em;
    }
    .blb-hdr-sub {
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.7rem;
      color: rgba(255,255,255,0.65); margin: 2px 0 0;
    }
    .blb-hdr-close {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.7); padding: 4px; line-height: 1; flex-shrink: 0;
    }
    .blb-hdr-close:hover { color: #fff; }
    .blb-hdr-close .material-symbols-outlined { font-size: 22px; display: block; }
    #blb-msgs {
      flex: 1; overflow-y: auto; padding: 14px 14px 8px;
      display: flex; flex-direction: column; gap: 10px;
    }
    #blb-msgs::-webkit-scrollbar { width: 4px; }
    #blb-msgs::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
    .blb-msg {
      max-width: 82%; word-break: break-word;
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.855rem; line-height: 1.55;
    }
    .blb-msg.bot {
      align-self: flex-start; background: #f0f4ff; color: #1a1c1c;
      padding: 10px 13px; border-radius: 16px 16px 16px 4px;
    }
    .blb-msg.user {
      align-self: flex-end; background: #00236f; color: #fff;
      padding: 10px 13px; border-radius: 16px 16px 4px 16px;
    }
    .blb-msg.typing {
      align-self: flex-start; background: #f0f4ff;
      padding: 12px 16px; border-radius: 16px 16px 16px 4px;
    }
    .blb-dots { display: flex; gap: 5px; align-items: center; height: 16px; }
    .blb-dots span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #00236f; opacity: 0.35; animation: blbBounce 1.2s infinite;
    }
    .blb-dots span:nth-child(2) { animation-delay: 0.2s; }
    .blb-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blbBounce {
      0%,60%,100% { transform: translateY(0); opacity: 0.35; }
      30%          { transform: translateY(-6px); opacity: 1; }
    }
    /* ── Quick action chips ── */
    #blb-actions {
      display: flex; gap: 6px; padding: 8px 12px 6px;
      border-top: 1px solid #f0f0f0; flex-shrink: 0;
      overflow-x: auto; scrollbar-width: none; background: #fafafa;
    }
    #blb-actions::-webkit-scrollbar { display: none; }
    .blb-chip {
      display: flex; align-items: center; gap: 4px;
      background: #fff; border: 1.5px solid #dde3ff; border-radius: 20px;
      padding: 5px 11px; font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.75rem; font-weight: 600; color: #00236f;
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .blb-chip:hover  { background: #f0f4ff; border-color: #00236f; }
    .blb-chip:active { transform: scale(0.95); }
    /* ── Contact cards inside chat ── */
    .blb-contact-card {
      background: #fff; border: 1.5px solid #e0e7ff; border-radius: 12px;
      padding: 10px 12px; margin-top: 6px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .blb-contact-card-title {
      font-size: 0.78rem; font-weight: 700; color: #00236f; margin: 0 0 4px;
    }
    .blb-contact-card-role {
      font-size: 0.72rem; color: #757682; margin: 0 0 6px;
    }
    .blb-contact-link {
      display: flex; align-items: center; gap: 5px;
      font-size: 0.78rem; color: #1e3a8a; text-decoration: none;
      font-weight: 600; margin-bottom: 2px;
    }
    .blb-contact-link .material-symbols-outlined { font-size: 14px; }
    .blb-contact-link:hover { text-decoration: underline; }
    /* ── Form ── */
    #blb-form {
      display: flex; padding: 10px 12px; gap: 8px;
      border-top: 1px solid #eee; flex-shrink: 0; align-items: flex-end;
    }
    #blb-input {
      flex: 1; border: 1.5px solid #e5e7eb; border-radius: 12px;
      padding: 9px 13px; font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.855rem; resize: none; outline: none;
      line-height: 1.45; transition: border-color 0.15s;
      max-height: 96px; overflow-y: auto; background: #fff; color: #1a1c1c;
    }
    #blb-input:focus { border-color: #00236f; }
    #blb-input::placeholder { color: #9ca3af; }
    #blb-send {
      width: 38px; height: 38px; border-radius: 50%; border: none;
      background: #00236f; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, transform 0.1s;
    }
    #blb-send:hover   { background: #1e3a8a; }
    #blb-send:active  { transform: scale(0.9); }
    #blb-send:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
    #blb-send .material-symbols-outlined { font-size: 18px; color: #fff; display: block; }
    @media (max-width: 480px) {
      #blb-chat-panel { right: 12px; bottom: 76px; width: calc(100vw - 24px); }
      #blb-chat-btn   { bottom: 16px; right: 16px; }
    }
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen    = false;
  let isLoading = false;
  let history   = [];
  let church    = { name: 'BLB Church', lat: null, lng: null, address: '' };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function scrollBottom() {
    const el = document.getElementById('blb-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Fetch Church Data ──────────────────────────────────────────────────────
  async function fetchChurchData() {
    try {
      const settingsRes = await fetch(
        `${REST_URL}/system_settings?select=church_name,church_address,church_lat,church_lng&limit=1`,
        { headers: REST_HEADERS }
      );

      if (settingsRes.ok) {
        const [s] = await settingsRes.json();
        if (s) {
          church.name    = s.church_name    || church.name;
          church.address = s.church_address || '';
          church.lat     = s.church_lat     || null;
          church.lng     = s.church_lng     || null;
        }
      }
    } catch (e) {
      // Non-fatal — widget still works without this data
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'blb-chat-btn';
    btn.setAttribute('aria-label', 'Open church assistant');
    btn.innerHTML = `<span class="material-symbols-outlined">chat</span>
                     <span id="blb-chat-badge"></span>`;
    btn.addEventListener('click', toggleChat);
    document.body.appendChild(btn);

    // Chat panel
    const panel = document.createElement('div');
    panel.id = 'blb-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'BLB Church Assistant');
    panel.innerHTML = `
      <div class="blb-hdr">
        <div class="blb-hdr-avatar">
          <span class="material-symbols-outlined">church</span>
        </div>
        <div class="blb-hdr-info">
          <p class="blb-hdr-title">Church Assistant</p>
          <p class="blb-hdr-sub">BLB Church · Tunajibu haraka 🕊️</p>
        </div>
        <button class="blb-hdr-close" id="blb-close" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div id="blb-msgs"></div>
      <div id="blb-actions">
        <button class="blb-chip" id="chip-map">📍 Njia ya Kuja</button>
        <button class="blb-chip" id="chip-bolt">🚗 Agiza Bolt</button>
        <button class="blb-chip" id="chip-contacts">📞 Contacts</button>
        <button class="blb-chip" id="chip-times">🕐 Ibada</button>
      </div>
      <form id="blb-form" autocomplete="off">
        <textarea
          id="blb-input"
          placeholder="Uliza swali... / Ask a question..."
          rows="1" maxlength="500"
        ></textarea>
        <button id="blb-send" type="submit" aria-label="Send message">
          <span class="material-symbols-outlined">send</span>
        </button>
      </form>`;
    document.body.appendChild(panel);

    document.getElementById('blb-close').addEventListener('click', closeChat);
    document.getElementById('blb-form').addEventListener('submit', onSubmit);
    document.getElementById('chip-map').addEventListener('click', onDirections);
    document.getElementById('chip-bolt').addEventListener('click', onBolt);
    document.getElementById('chip-contacts').addEventListener('click', () => {
      appendUser('Nataka mawasiliano ya kanisa (contacts za admin)');
      sendToBot('Nataka mawasiliano ya kanisa (contacts za admin)');
    });
    document.getElementById('chip-times').addEventListener('click', () => {
      appendUser('Nyakati za ibada ni zipi?');
      sendToBot('Nyakati za ibada ni zipi?');
    });

    const input = document.getElementById('blb-input');
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('blb-form').dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    // Fetch church data and show welcome message in parallel
    fetchChurchData();
    setTimeout(() => {
      appendBot('Shalom! 🕊️ Karibu BLB Church Assistant.\n\nUnaweza kuniuliza chochote kuhusu kanisa, au tumia vitufe vya haraka hapo chini.\n\nWelcome! Ask me anything or use the quick buttons below.');
    }, 700);
  }

  // ── Open / Close ───────────────────────────────────────────────────────────
  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    document.getElementById('blb-chat-panel').classList.add('open');
    document.getElementById('blb-chat-btn').classList.remove('has-msg');
    setTimeout(() => { document.getElementById('blb-input')?.focus(); }, 280);
  }

  function closeChat() {
    isOpen = false;
    document.getElementById('blb-chat-panel').classList.remove('open');
  }

  // ── Message Rendering ──────────────────────────────────────────────────────
  function appendBot(text) {
    const msgs = document.getElementById('blb-msgs');
    const div  = document.createElement('div');
    div.className = 'blb-msg bot';
    div.innerHTML = esc(text).replace(/\n/g, '<br>');
    msgs.appendChild(div);
    scrollBottom();
    if (!isOpen) document.getElementById('blb-chat-btn').classList.add('has-msg');
    return div;
  }

  function appendUser(text) {
    const msgs = document.getElementById('blb-msgs');
    const div  = document.createElement('div');
    div.className = 'blb-msg user';
    div.textContent = text;
    msgs.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    removeTyping();
    const msgs = document.getElementById('blb-msgs');
    const div  = document.createElement('div');
    div.className = 'blb-msg typing';
    div.id = 'blb-typing';
    div.innerHTML = '<div class="blb-dots"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    scrollBottom();
  }

  function removeTyping() {
    document.getElementById('blb-typing')?.remove();
  }

  // ── Quick Action: Google Maps Directions ───────────────────────────────────
  function onDirections() {
    const { lat, lng, address, name } = church;

    if (!lat && !address) {
      appendBot('Samahani, anuani ya kanisa haijawekwa bado. Tafadhali wasiliana na ofisi.\nSorry, church location is not configured yet.');
      return;
    }

    const destination = lat
      ? `${lat},${lng}`
      : encodeURIComponent(address || name);

    if (navigator.geolocation) {
      appendBot('Inatafuta mahali ulipo... 📍');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const url = `https://www.google.com/maps/dir/${pos.coords.latitude},${pos.coords.longitude}/${destination}`;
          window.open(url, '_blank');
          // Replace the "searching" message
          const msgs = document.getElementById('blb-msgs');
          const last = msgs.querySelector('.blb-msg.bot:last-child');
          if (last) last.remove();
          appendBot('Google Maps imefunguliwa na maelekezo ya kuja kanisani! 🗺️');
        },
        () => {
          // Permission denied or unavailable — open church location only
          const url = lat
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || name)}`;
          window.open(url, '_blank');
          const msgs = document.getElementById('blb-msgs');
          const last = msgs.querySelector('.blb-msg.bot:last-child');
          if (last) last.remove();
          appendBot('Ramani ya kanisa imefunguliwa! 🗺️\n(Wezesha GPS kupata maelekezo kamili.)');
        }
      );
    } else {
      // No geolocation API
      const url = lat
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || name)}`;
      window.open(url, '_blank');
      appendBot('Ramani ya kanisa imefunguliwa! 🗺️');
    }
  }

  // ── Quick Action: Bolt ─────────────────────────────────────────────────────
  function onBolt() {
    const { lat, lng, name } = church;

    if (!lat || !lng) {
      appendBot('Samahani, koordinati za kanisa hazijawekwa bado. Tumia kitufe cha "📍 Njia ya Kuja" badala yake.');
      return;
    }

    // Bolt deep link — tries to open Bolt app
    const boltLink = `bolt://order?destination_lat=${lat}&destination_lng=${lng}&destination_name=${encodeURIComponent(name)}`;
    window.location.href = boltLink;

    // Fallback: if Bolt not installed, open Play Store after 2s
    setTimeout(() => {
      appendBot('Kama Bolt haijafunguka, bonyeza hapa kudownload: play.google.com/Bolt 🚗');
      setTimeout(() => {
        window.open('https://play.google.com/store/apps/details?id=ee.mtakso.client', '_blank');
      }, 1500);
    }, 2000);
  }

  // ── Send to AI ─────────────────────────────────────────────────────────────
  async function sendToBot(msg) {
    isLoading = true;
    document.getElementById('blb-send').disabled = true;
    showTyping();

    try {
      const res  = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ message: msg, history }),
      });

      const data = await res.json();
      removeTyping();

      if (data.reply) {
        history.push({ role: 'user', content: msg });
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > 12) history = history.slice(-12);
        appendBot(data.reply);
      } else {
        console.error('[BLB Chatbot]', res.status, data);
        appendBot('Samahani, kulikuwa na tatizo. Tafadhali jaribu tena.\nSorry, something went wrong. Please try again.');
      }
    } catch (err) {
      removeTyping();
      console.error('[BLB Chatbot] Network error:', err);
      appendBot('Samahani, kuna tatizo la muunganiko. Angalia mtandao wako.');
    }

    isLoading = false;
    document.getElementById('blb-send').disabled = false;
    document.getElementById('blb-input')?.focus();
  }

  // ── Form Submit ────────────────────────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    const input = document.getElementById('blb-input');
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.style.height = 'auto';
    appendUser(msg);
    await sendToBot(msg);
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
