/**
 * BLB Church — Admin AI Assistant Widget
 * Full church data access. Admin/Super-Admin only.
 * Supports announcement creation via AI.
 */
(function () {
  'use strict';

  const FUNCTION_URL = 'https://vscjivuatnchqwtcgggn.supabase.co/functions/v1/admin-ai';
  const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY2ppdnVhdG5jaHF3dGNnZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTk0OTMsImV4cCI6MjA5MDY5NTQ5M30.AwLLf--l1BWXU7p7OPCJ28y5dxL7g90QSxFrnhe6Iq8';

  const SUGGESTIONS = [
    'Waumini wangapi leo?',
    'Michango ya mwezi huu?',
    'Matukio yanayokuja?',
    'Idara ipi ina waumini wengi?',
    'Niandikia tangazo la Jumapili',
    'Waumini wapya wiki hii?',
  ];

  // ── CSS ────────────────────────────────────────────────────────────────────
  const CSS = `
    #adm-ai-btn {
      position:fixed;bottom:88px;right:24px;z-index:9997;
      width:56px;height:56px;border-radius:50%;
      background:#00236f;border:3px solid #fed01b;cursor:pointer;
      box-shadow:0 4px 20px rgba(0,35,111,0.4);
      display:flex;align-items:center;justify-content:center;
      transition:transform 0.2s,box-shadow 0.2s;
    }
    #adm-ai-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,35,111,0.5);}
    #adm-ai-btn .material-symbols-outlined{font-size:26px;color:#fed01b;font-variation-settings:'FILL' 1;}
    #adm-ai-badge{position:absolute;top:-3px;right:-3px;width:14px;height:14px;
      border-radius:50%;background:#ef4444;border:2px solid #fff;display:none;}
    #adm-ai-btn.has-msg #adm-ai-badge{display:block;}

    #adm-ai-panel {
      position:fixed;bottom:154px;right:24px;z-index:9996;
      width:420px;max-width:calc(100vw - 32px);
      height:580px;max-height:calc(100vh - 175px);
      background:#fff;border-radius:20px;
      box-shadow:0 12px 48px rgba(0,35,111,0.18);
      display:flex;flex-direction:column;overflow:hidden;
      transform:scale(0.88) translateY(16px);opacity:0;
      transform-origin:bottom right;
      transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s;
      pointer-events:none;
    }
    #adm-ai-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}

    .adm-hdr{
      background:linear-gradient(135deg,#00236f 0%,#1e3a8a 100%);
      padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;
    }
    .adm-hdr-avatar{width:38px;height:38px;border-radius:50%;background:#fed01b;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .adm-hdr-avatar .material-symbols-outlined{font-size:20px;color:#00236f;font-variation-settings:'FILL' 1;}
    .adm-hdr-info{flex:1;min-width:0;}
    .adm-hdr-title{font-family:'Inter',sans-serif;font-size:0.9rem;font-weight:800;
      color:#fff;margin:0;letter-spacing:-0.01em;}
    .adm-hdr-sub{font-family:'Plus Jakarta Sans',sans-serif;font-size:0.68rem;
      color:rgba(255,255,255,0.55);margin:2px 0 0;}
    .adm-hdr-close{background:none;border:none;cursor:pointer;
      color:rgba(255,255,255,0.6);padding:4px;line-height:1;flex-shrink:0;}
    .adm-hdr-close:hover{color:#fff;}
    .adm-hdr-close .material-symbols-outlined{font-size:20px;display:block;}

    #adm-msgs{flex:1;overflow-y:auto;padding:12px 14px 8px;
      display:flex;flex-direction:column;gap:9px;}
    #adm-msgs::-webkit-scrollbar{width:3px;}
    #adm-msgs::-webkit-scrollbar-thumb{background:#dde3ff;border-radius:2px;}

    .adm-msg{max-width:86%;word-break:break-word;
      font-family:'Plus Jakarta Sans',sans-serif;font-size:0.84rem;line-height:1.55;}
    .adm-msg.bot{align-self:flex-start;background:#f0f4ff;color:#1a1c1c;
      padding:9px 13px;border-radius:14px 14px 14px 4px;}
    .adm-msg.user{align-self:flex-end;background:#00236f;color:#fff;
      padding:9px 13px;border-radius:14px 14px 4px 14px;}
    .adm-msg.typing{align-self:flex-start;background:#f0f4ff;
      padding:11px 15px;border-radius:14px 14px 14px 4px;}
    .adm-dots{display:flex;gap:5px;align-items:center;height:15px;}
    .adm-dots span{width:6px;height:6px;border-radius:50%;background:#00236f;
      opacity:0.3;animation:admBounce 1.2s infinite;}
    .adm-dots span:nth-child(2){animation-delay:0.2s;}
    .adm-dots span:nth-child(3){animation-delay:0.4s;}
    @keyframes admBounce{
      0%,60%,100%{transform:translateY(0);opacity:0.3;}
      30%{transform:translateY(-5px);opacity:1;}
    }

    /* Announcement preview card */
    .adm-announce-card{
      align-self:flex-start;max-width:92%;
      background:#fff;border:2px solid #00236f;border-radius:14px;
      overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;
    }
    .adm-announce-card-hdr{
      background:#00236f;padding:8px 12px;
      display:flex;align-items:center;gap:6px;
    }
    .adm-announce-card-hdr .material-symbols-outlined{font-size:16px;color:#fed01b;font-variation-settings:'FILL' 1;}
    .adm-announce-card-hdr span.lbl{font-size:0.7rem;font-weight:800;
      color:#fed01b;text-transform:uppercase;letter-spacing:0.1em;}
    .adm-announce-body{padding:10px 12px;}
    .adm-announce-title{font-weight:800;font-size:0.88rem;color:#00236f;margin:0 0 4px;}
    .adm-announce-content{font-size:0.8rem;color:#444651;line-height:1.5;margin:0 0 8px;
      display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
    .adm-announce-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
    .adm-announce-tag{font-size:0.68rem;font-weight:700;padding:2px 8px;
      border-radius:20px;background:#f0f4ff;color:#00236f;}
    .adm-announce-actions{display:flex;gap:8px;}
    .adm-btn-publish{flex:1;padding:7px;background:#00236f;color:#fff;border:none;
      border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.78rem;
      font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;
      transition:background 0.15s;}
    .adm-btn-publish:hover{background:#1e3a8a;}
    .adm-btn-publish:disabled{background:#9ca3af;cursor:not-allowed;}
    .adm-btn-publish .material-symbols-outlined{font-size:15px;font-variation-settings:'FILL' 1;}
    .adm-btn-discard{padding:7px 12px;background:none;border:1.5px solid #e5e7eb;
      border-radius:8px;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.78rem;
      color:#757682;cursor:pointer;transition:border-color 0.15s;}
    .adm-btn-discard:hover{border-color:#ba1a1a;color:#ba1a1a;}

    #adm-suggestions{display:flex;gap:6px;padding:6px 12px 4px;
      overflow-x:auto;flex-shrink:0;scrollbar-width:none;
      border-top:1px solid #f0f0f0;background:#fafafa;}
    #adm-suggestions::-webkit-scrollbar{display:none;}
    .adm-sug{background:#fff;border:1.5px solid #dde3ff;border-radius:20px;
      padding:4px 10px;font-family:'Plus Jakarta Sans',sans-serif;
      font-size:0.72rem;font-weight:600;color:#00236f;
      cursor:pointer;white-space:nowrap;flex-shrink:0;
      transition:background 0.12s,border-color 0.12s;}
    .adm-sug:hover{background:#f0f4ff;border-color:#00236f;}

    #adm-form{display:flex;padding:9px 11px;gap:7px;
      border-top:1px solid #eee;flex-shrink:0;align-items:flex-end;}
    #adm-input{flex:1;border:1.5px solid #e5e7eb;border-radius:11px;
      padding:8px 12px;font-family:'Plus Jakarta Sans',sans-serif;
      font-size:0.835rem;resize:none;outline:none;line-height:1.45;
      transition:border-color 0.15s;max-height:90px;overflow-y:auto;
      background:#fff;color:#1a1c1c;}
    #adm-input:focus{border-color:#00236f;}
    #adm-input::placeholder{color:#9ca3af;}
    #adm-send{width:36px;height:36px;border-radius:50%;border:none;
      background:#00236f;cursor:pointer;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      transition:background 0.15s,transform 0.1s;}
    #adm-send:hover{background:#1e3a8a;}
    #adm-send:active{transform:scale(0.9);}
    #adm-send:disabled{background:#9ca3af;cursor:not-allowed;transform:none;}
    #adm-send .material-symbols-outlined{font-size:17px;color:#fff;display:block;}

    @media(max-width:480px){
      #adm-ai-panel{right:12px;bottom:140px;width:calc(100vw - 24px);}
      #adm-ai-btn{bottom:80px;right:16px;}
    }
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen = false, isLoading = false, history = [], authToken = null;

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function scrollBottom() {
    const el = document.getElementById('adm-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function getToken() {
    if (authToken) return authToken;
    try {
      const { data } = await window.supabase.auth.getSession();
      authToken = data?.session?.access_token || null;
    } catch {}
    return authToken;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Floating button — round with chat icon, matching dashboard style
    const btn = document.createElement('button');
    btn.id = 'adm-ai-btn';
    btn.setAttribute('aria-label', 'Admin AI Assistant');
    btn.innerHTML = `<span class="material-symbols-outlined">chat</span><span id="adm-ai-badge"></span>`;
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'adm-ai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Admin AI Assistant');
    panel.innerHTML = `
      <div class="adm-hdr">
        <div class="adm-hdr-avatar">
          <span class="material-symbols-outlined">smart_toy</span>
        </div>
        <div class="adm-hdr-info">
          <p class="adm-hdr-title">Admin AI Assistant</p>
          <p class="adm-hdr-sub">Data yote ya kanisa · Unaweza kuunda matangazo</p>
        </div>
        <button class="adm-hdr-close" id="adm-close" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div id="adm-msgs"></div>
      <div id="adm-suggestions"></div>
      <form id="adm-form" autocomplete="off">
        <textarea id="adm-input" placeholder="Uliza kuhusu data, au andika 'Nitengenezee tangazo...'" rows="1" maxlength="600"></textarea>
        <button id="adm-send" type="submit" aria-label="Send">
          <span class="material-symbols-outlined">send</span>
        </button>
      </form>`;
    document.body.appendChild(panel);

    document.getElementById('adm-close').addEventListener('click', close);
    document.getElementById('adm-form').addEventListener('submit', onSubmit);

    // Quick suggestion chips
    const sugBox = document.getElementById('adm-suggestions');
    SUGGESTIONS.forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'adm-sug';
      b.textContent = q;
      b.addEventListener('click', () => { appendUser(q); sendToAI(q); });
      sugBox.appendChild(b);
    });

    const input = document.getElementById('adm-input');
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('adm-form').dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    setTimeout(() => appendBot('Habari! Nina uwezo wa kukupa taarifa zote za BLB Church — waumini, michango, matukio, na zaidi. Pia ninaweza kukusaidia kuandika na kuchapisha matangazo moja kwa moja! 🚀'), 600);
  }

  // ── Open/Close ─────────────────────────────────────────────────────────────
  function toggle() { isOpen ? close() : open(); }
  function open() {
    isOpen = true;
    document.getElementById('adm-ai-panel').classList.add('open');
    document.getElementById('adm-ai-btn').classList.remove('has-msg');
    setTimeout(() => document.getElementById('adm-input')?.focus(), 280);
  }
  function close() {
    isOpen = false;
    document.getElementById('adm-ai-panel').classList.remove('open');
  }

  // ── Message Rendering ──────────────────────────────────────────────────────
  function appendBot(text) {
    const msgs = document.getElementById('adm-msgs');
    const div = document.createElement('div');
    div.className = 'adm-msg bot';
    div.innerHTML = esc(text).replace(/\n/g, '<br>');
    msgs.appendChild(div);
    scrollBottom();
    if (!isOpen) document.getElementById('adm-ai-btn').classList.add('has-msg');
  }

  function appendUser(text) {
    const msgs = document.getElementById('adm-msgs');
    const div = document.createElement('div');
    div.className = 'adm-msg user';
    div.textContent = text;
    msgs.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    document.getElementById('adm-typing')?.remove();
    const msgs = document.getElementById('adm-msgs');
    const div = document.createElement('div');
    div.className = 'adm-msg typing';
    div.id = 'adm-typing';
    div.innerHTML = '<div class="adm-dots"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    scrollBottom();
  }
  function removeTyping() { document.getElementById('adm-typing')?.remove(); }

  // ── Announcement Card ──────────────────────────────────────────────────────
  function renderAnnounceCard(ann) {
    const priorityLabels = { urgent:'Dharura', new:'Habari Mpya', update:'Sasisho', general:'Matangazo' };
    const targetLabels   = { general:'Waumini Wote', public:'Umma', department:'Idara' };

    const msgs = document.getElementById('adm-msgs');
    const card = document.createElement('div');
    card.className = 'adm-announce-card';
    card.innerHTML = `
      <div class="adm-announce-card-hdr">
        <span class="material-symbols-outlined">campaign</span>
        <span class="lbl">Rasimu ya Tangazo</span>
      </div>
      <div class="adm-announce-body">
        <p class="adm-announce-title">${esc(ann.title)}</p>
        <p class="adm-announce-content">${esc(ann.content)}</p>
        <div class="adm-announce-meta">
          <span class="adm-announce-tag">${esc(priorityLabels[ann.priority] || ann.priority)}</span>
          <span class="adm-announce-tag">${esc(targetLabels[ann.target_type] || ann.target_type)}</span>
        </div>
        <div class="adm-announce-actions">
          <button class="adm-btn-publish" id="adm-pub-btn">
            <span class="material-symbols-outlined">send</span>
            Chapisha Sasa
          </button>
          <button class="adm-btn-discard">Acha</button>
        </div>
      </div>`;
    msgs.appendChild(card);
    scrollBottom();

    card.querySelector('.adm-btn-publish').addEventListener('click', () => publishAnnouncement(ann, card));
    card.querySelector('.adm-btn-discard').addEventListener('click', () => {
      card.remove();
      appendBot('Tangazo limeachwa. Unaweza kuomba toleo jingine wakati wowote.');
    });
  }

  async function publishAnnouncement(ann, card) {
    const pubBtn = card.querySelector('.adm-btn-publish');
    pubBtn.disabled = true;
    pubBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> Inachapisha...';

    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      const { error } = await window.supabase.from('announcements').insert({
        title:       ann.title,
        content:     ann.content,
        priority:    ann.priority || 'general',
        target_type: ann.target_type || 'general',
        is_active:   true,
        created_by:  user?.id || null,
      });

      if (error) throw error;

      card.innerHTML = `
        <div class="adm-announce-card-hdr">
          <span class="material-symbols-outlined">check_circle</span>
          <span class="lbl">Tangazo Limechapishwa!</span>
        </div>
        <div class="adm-announce-body">
          <p style="font-family:'Plus Jakarta Sans',sans-serif;font-size:0.82rem;color:#444651;margin:0;">
            "${esc(ann.title)}" imesent kwa waumini wote. ✅
          </p>
        </div>`;

      if (typeof Toast !== 'undefined') Toast.success('Tangazo limechapishwa!');

    } catch (err) {
      pubBtn.disabled = false;
      pubBtn.innerHTML = '<span class="material-symbols-outlined">send</span> Jaribu Tena';
      appendBot('Imeshindwa kuchapisha: ' + (err.message || 'Tatizo la seva. Jaribu tena.'));
    }
  }

  // ── Parse AI response for [[ANNOUNCE:{...}]] tags ─────────────────────────
  function parseResponse(text) {
    const match = text.match(/\[\[ANNOUNCE:([\s\S]*?)\]\]/);
    if (!match) return { text, announce: null };
    try {
      const announce = JSON.parse(match[1]);
      const cleanText = text.replace(/\[\[ANNOUNCE:[\s\S]*?\]\]/, '').trim();
      return { text: cleanText, announce };
    } catch {
      return { text, announce: null };
    }
  }

  // ── Send to AI ─────────────────────────────────────────────────────────────
  async function sendToAI(msg) {
    isLoading = true;
    document.getElementById('adm-send').disabled = true;
    showTyping();

    try {
      const token = await getToken();
      if (!token) {
        removeTyping();
        appendBot('Session imekwisha. Tafadhali refresh ukurasa na uingie tena.');
        return;
      }

      const res  = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey':        ANON_KEY,
        },
        body: JSON.stringify({ message: msg, history }),
      });

      const data = await res.json();
      removeTyping();

      if (data.reply) {
        history.push({ role: 'user', content: msg });
        history.push({ role: 'assistant', content: data.reply });
        if (history.length > 16) history = history.slice(-16);

        const { text, announce } = parseResponse(data.reply);
        if (text) appendBot(text);
        if (announce) renderAnnounceCard(announce);

      } else {
        console.error('[Admin AI]', res.status, data);
        appendBot('Samahani, kulikuwa na tatizo: ' + (data.error || 'Jaribu tena.'));
      }
    } catch (err) {
      removeTyping();
      appendBot('Tatizo la muunganiko. Angalia mtandao wako.');
    }

    isLoading = false;
    document.getElementById('adm-send').disabled = false;
    document.getElementById('adm-input')?.focus();
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (isLoading) return;
    const input = document.getElementById('adm-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.style.height = 'auto';
    appendUser(msg);
    await sendToAI(msg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
