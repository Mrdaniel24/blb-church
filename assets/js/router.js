/**
 * BLB Church — Route Guard & Permission Enforcement
 *
 * Usage on every protected page:
 *   <body data-required-role="admin" data-required-perm="can_manage_members">
 *
 * Nav items that should be hidden without a permission:
 *   <a href="./members.html" data-perm="can_manage_members">…</a>
 *
 * Call initPageGuard() at page load.
 * Returns { ...profile, permissions } or null (already redirected).
 */

const ROLE_HIERARCHY = { member: 1, admin: 2, super_admin: 3 };

function hasAccess(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

// Global permissions cache so page scripts can read without re-fetching
window.__blbPermissions = null;

async function initPageGuard() {
  document.body.style.opacity = '0';

  const session = await getSession();
  if (!session) { _redirect('/public/login.html'); return null; }

  const profile = await getUserProfile();
  if (!profile) { _redirect('/public/login.html'); return null; }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    _redirect('/public/login.html?error=inactive');
    return null;
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const requiredRole = document.body.dataset.requiredRole || 'member';
  if (!hasAccess(profile.role, requiredRole)) {
    redirectToDashboard(profile.role);
    return null;
  }

  // ── Permission check (admin pages only) ──────────────────────────────────
  let permissions = null;
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    permissions = await getAdminPermissions();
    window.__blbPermissions = permissions;

    // Block page if body declares a required permission and user lacks it
    const requiredPerm = document.body.dataset.requiredPerm;
    if (requiredPerm && !hasPermission(permissions, requiredPerm)) {
      redirectToDashboard(profile.role);
      return null;
    }

    // Hide nav items the user has no permission for
    _applyNavPermissions(permissions);
  }

  // ── Reveal page ───────────────────────────────────────────────────────────
  document.body.style.opacity = '1';

  populateUserUI(profile);

  // ── WhatsApp contact prompt (admins only, if not yet set) ─────────────────
  if ((profile.role === 'admin' || profile.role === 'super_admin') && !profile.whatsapp) {
    console.log('[BLB] WhatsApp not set — showing prompt for', profile.role);
    setTimeout(() => _showWhatsAppPrompt(profile), 900);
  }

  // Attach permissions to profile so page scripts can read profile.permissions
  profile.permissions = permissions;
  return profile;
}

/**
 * Hide sidebar/nav links the current admin doesn't have permission for.
 * Matches [data-perm] on <a> tags. Hides the element and its <li> wrapper.
 */
function _applyNavPermissions(permissions) {
  document.querySelectorAll('[data-perm]').forEach(el => {
    const key = el.dataset.perm;
    if (!hasPermission(permissions, key)) {
      // Hide the link; also hide parent <li> if it exists
      el.style.display = 'none';
      if (el.parentElement && el.parentElement.tagName === 'LI') {
        el.parentElement.style.display = 'none';
      }
    }
  });
}

function _redirect(url) {
  // Use absolute path resolution relative to origin
  const base = window.location.origin;
  window.location.href = url.startsWith('http') ? url : base + url;
}

/**
 * Populate common UI elements with user data.
 */
function populateUserUI(profile) {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = profile.full_name || 'User';
  });
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = profile.email || '';
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    const labels = { member: 'Member', admin: 'Administrator', super_admin: 'Super Admin' };
    el.textContent = labels[profile.role] || profile.role;
  });
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    if (profile.avatar_url) el.src = profile.avatar_url;
  });
  document.querySelectorAll('[data-user-department]').forEach(el => {
    el.textContent = profile.departments?.name || 'No Department';
  });

  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); logoutUser(); });
  });

  setActiveNavLink();
}

/**
 * Highlight the active nav link by matching the current URL filename.
 */
function setActiveNavLink() {
  const currentFile = window.location.pathname.split('/').pop();
  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkFile = href.split('/').pop().split('?')[0];
    if (linkFile && linkFile === currentFile) {
      link.classList.add('active-nav');
    }
  });
}

/**
 * Redirect user to their role-appropriate dashboard.
 */
function redirectToDashboard(role) {
  const dashboards = {
    member:      '/member/dashboard.html',
    admin:       '/admin/dashboard.html',
    super_admin: '/super-admin/dashboard.html',
  };
  _redirect(dashboards[role] || '/public/login.html');
}

/**
 * Build a department-scoped filter for Supabase queries.
 * Returns an object with the filter column and value, or null for unscoped.
 *
 * Usage:
 *   const scope = getDeptScope(profile.permissions);
 *   let q = supabase.from('contributions').select('*');
 *   if (scope) q = q.eq(scope.column, scope.value);
 *
 * @param {Object|null} permissions
 * @param {string} column - column name to filter on (default: 'department_id')
 * @returns {{ column: string, value: string }|null}
 */
function getDeptScope(permissions, column = 'department_id') {
  if (!permissions) return null;
  if (permissions.all) return null;              // super_admin: unscoped
  if (!permissions.department_id) return null;   // no dept assigned: unscoped (edge case)
  return { column, value: permissions.department_id };
}

// Expose globally
window.initPageGuard    = initPageGuard;
window.redirectToDashboard = redirectToDashboard;
window.hasAccess        = hasAccess;
window.getDeptScope     = getDeptScope;
window.populateUserUI   = populateUserUI;
window.setActiveNavLink = setActiveNavLink;

// Listen for logout from another tab
window.supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') _redirect('/public/login.html');
});

// ── WhatsApp Contact Prompt ───────────────────────────────────────────────────
// Shown to admins/super_admins who haven't set their WhatsApp number yet.
// Styled to match the announcement modal in public/index.html.
async function _showWhatsAppPrompt(profile) {
  console.log('[BLB] _showWhatsAppPrompt called');
  const SNOOZE_KEY = 'blb_wa_snoozed';
  const snoozed = localStorage.getItem(SNOOZE_KEY);
  if (snoozed && Date.now() - parseInt(snoozed) < 24 * 60 * 60 * 1000) {
    console.log('[BLB] Prompt snoozed — skipping');
    return;
  }

  // ── Styles (announcement modal aesthetic) ────────────────────────────────
  if (!document.getElementById('blb-wa-css')) {
    const s = document.createElement('style');
    s.id = 'blb-wa-css';
    s.textContent = `
      #blb-wa-overlay {
        position:fixed;inset:0;z-index:99999;
        background:rgba(0,0,0,0.72);
        backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
        display:flex;align-items:center;justify-content:center;padding:1rem;
        opacity:0;transition:opacity 0.35s ease;
      }
      #blb-wa-overlay.blb-wa-show{opacity:1;}
      #blb-wa-modal {
        background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 50%,#0a1628 100%);
        border:1px solid rgba(255,255,255,0.06);
        border-radius:0.875rem;
        box-shadow:0 20px 60px rgba(0,0,0,0.55);
        width:100%;max-width:440px;position:relative;overflow:hidden;
        transform:scale(0.93) translateY(14px);
        transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);
      }
      #blb-wa-overlay.blb-wa-show #blb-wa-modal{transform:scale(1) translateY(0);}
      #blb-wa-modal::before{
        content:'';position:absolute;top:0;left:0;right:0;height:1.5px;
        background:linear-gradient(90deg,transparent,#fed01b 30%,#fed01b 70%,transparent);
      }
      #blb-wa-modal::after{
        content:'';position:absolute;top:-70px;left:50%;transform:translateX(-50%);
        width:220px;height:150px;pointer-events:none;
        background:radial-gradient(ellipse,rgba(254,208,27,0.07) 0%,transparent 70%);
      }
      #blb-wa-card{padding:1.75rem 1.75rem 1.5rem;position:relative;z-index:1;}
      .blb-wa-badge{
        display:inline-flex;align-items:center;gap:0.45rem;
        padding:0.28rem 0.7rem;border-radius:9999px;
        background:rgba(37,211,102,0.12);margin-bottom:1.2rem;
      }
      .blb-wa-badge-dot{
        width:6px;height:6px;border-radius:50%;background:#25d166;
        animation:blbWaPulse 1.8s ease-in-out infinite;
      }
      @keyframes blbWaPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.7)}}
      .blb-wa-badge-txt{
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.6rem;
        font-weight:800;letter-spacing:0.2em;text-transform:uppercase;
        color:rgba(37,211,102,0.9);
      }
      .blb-wa-label-row{
        display:flex;align-items:center;gap:0.7rem;margin-bottom:0.7rem;
      }
      .blb-wa-label-line{
        flex-shrink:0;height:1px;width:1.75rem;
        background:rgba(254,208,27,0.5);
      }
      .blb-wa-label-txt{
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.6rem;
        font-weight:800;letter-spacing:0.22em;text-transform:uppercase;
        color:rgba(254,208,27,0.8);
      }
      #blb-wa-title{
        font-family:'Inter',sans-serif;font-size:1.45rem;font-weight:900;
        letter-spacing:-0.03em;color:#fff;line-height:1.15;margin:0 0 0.6rem;
      }
      #blb-wa-desc{
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
        font-weight:500;color:rgba(220,225,255,0.62);line-height:1.7;
        margin:0 0 1.25rem;
      }
      .blb-wa-input-wrap{position:relative;margin-bottom:0.5rem;}
      .blb-wa-input-icon{
        position:absolute;left:11px;top:50%;transform:translateY(-50%);
        color:rgba(255,255,255,0.3);font-size:18px;pointer-events:none;
        font-variation-settings:'FILL' 1;
      }
      #blb-wa-input{
        width:100%;background:rgba(255,255,255,0.06);
        border:1.5px solid rgba(255,255,255,0.1);border-radius:0.625rem;
        padding:0.72rem 0.875rem 0.72rem 2.4rem;
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.9rem;
        color:#fff;outline:none;
        transition:border-color 0.2s,background 0.2s;box-sizing:border-box;
      }
      #blb-wa-input::placeholder{color:rgba(255,255,255,0.28);}
      #blb-wa-input:focus{
        border-color:rgba(37,211,102,0.45);background:rgba(255,255,255,0.08);
      }
      #blb-wa-error{
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.77rem;
        color:#f87171;margin:0.35rem 0 0.75rem;display:none;
      }
      #blb-wa-error.blb-wa-err-show{display:block;}
      #blb-wa-save{
        width:100%;padding:0.72rem;
        background:#25d166;border:none;border-radius:0.625rem;
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;
        font-weight:700;color:#fff;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:6px;
        transition:background 0.15s,transform 0.1s;
      }
      #blb-wa-save:hover{background:#1fba5a;}
      #blb-wa-save:active{transform:scale(0.98);}
      #blb-wa-save:disabled{background:#374151;cursor:not-allowed;}
      #blb-wa-later{
        display:block;width:100%;background:none;border:none;
        font-family:'Plus Jakarta Sans',sans-serif;font-size:0.78rem;
        color:rgba(255,255,255,0.28);cursor:pointer;padding:0.6rem;
        text-align:center;transition:color 0.15s;margin-top:0.5rem;
      }
      #blb-wa-later:hover{color:rgba(255,255,255,0.5);}
      #blb-wa-footer{
        padding:0.8rem 1.75rem;border-top:1px solid rgba(255,255,255,0.05);
        text-align:center;font-family:'Plus Jakarta Sans',sans-serif;
        font-size:0.68rem;color:rgba(255,255,255,0.18);
      }
    `;
    document.head.appendChild(s);
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'blb-wa-overlay';
  overlay.innerHTML = `
    <div id="blb-wa-modal">
      <div id="blb-wa-card">
        <div class="blb-wa-badge">
          <span class="blb-wa-badge-dot"></span>
          <span class="blb-wa-badge-txt">Hatua Muhimu</span>
        </div>
        <div class="blb-wa-label-row">
          <span class="blb-wa-label-line"></span>
          <span class="blb-wa-label-txt">BLB Church Admin</span>
          <span class="blb-wa-label-line"></span>
        </div>
        <h2 id="blb-wa-title">Weka Namba Yako ya WhatsApp</h2>
        <p id="blb-wa-desc">
          Waumini wanaweza kukuwasiliana nawe moja kwa moja kupitia WhatsApp
          wakihitaji msaada. Namba hii itaonekana kwa waumini walioingia tu.
        </p>
        <div class="blb-wa-input-wrap">
          <span class="blb-wa-input-icon material-symbols-outlined">phone_iphone</span>
          <input
            id="blb-wa-input"
            type="tel"
            placeholder="+255 7XX XXX XXX"
            maxlength="20"
            autocomplete="tel"
          />
        </div>
        <p id="blb-wa-error"></p>
        <button id="blb-wa-save">
          <span class="material-symbols-outlined" style="font-size:18px;">chat</span>
          Hifadhi Namba
        </button>
        <button id="blb-wa-later">Nitaweka baadaye</button>
      </div>
      <div id="blb-wa-footer">
        Unaweza kubadilisha namba yako wakati wowote kwenye ukurasa wa Profile.
      </div>
    </div>`;
  document.body.appendChild(overlay);
  console.log('[BLB] WhatsApp prompt overlay appended to body');

  // Animate in — use setTimeout instead of rAF for reliability
  setTimeout(() => overlay.classList.add('blb-wa-show'), 60);

  function closePrompt() {
    overlay.classList.remove('blb-wa-show');
    setTimeout(() => overlay.remove(), 400);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  document.getElementById('blb-wa-save').addEventListener('click', async () => {
    const input   = document.getElementById('blb-wa-input');
    const errorEl = document.getElementById('blb-wa-error');
    const saveBtn = document.getElementById('blb-wa-save');
    const val     = input.value.trim();

    errorEl.classList.remove('blb-wa-err-show');

    if (!val || val.replace(/\D/g, '').length < 9) {
      errorEl.textContent = 'Tafadhali weka namba sahihi ya simu (angalau tarakimu 9).';
      errorEl.classList.add('blb-wa-err-show');
      input.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Inahifadhi...';

    const { error } = await window.supabase
      .from('profiles')
      .update({ whatsapp: val })
      .eq('id', profile.id);

    if (error) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Hifadhi Namba';
      errorEl.textContent = 'Imeshindwa kuhifadhi. Tafadhali jaribu tena.';
      errorEl.classList.add('blb-wa-err-show');
      return;
    }

    // Update cached profile
    if (window.__blbProfileCache) window.__blbProfileCache.whatsapp = val;
    closePrompt();
  });

  // ── Later ─────────────────────────────────────────────────────────────────
  document.getElementById('blb-wa-later').addEventListener('click', () => {
    localStorage.setItem(SNOOZE_KEY, Date.now().toString());
    closePrompt();
  });
}
