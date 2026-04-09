/**
 * BLB Church Digital Management System
 * Common Utilities
 * 
 * Shared UI helpers: toast notifications, loading states, modals, etc.
 */

// ============================================
// Toast Notification System
// ============================================
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed; top: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const colors = {
      success: { bg: '#dcfce7', text: '#166534', border: '#86efac', icon: 'check_circle' },
      error:   { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', icon: 'error' },
      warning: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', icon: 'warning' },
      info:    { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', icon: 'info' },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border};
      padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      pointer-events: auto; cursor: pointer;
      transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 400px;
    `;
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">${c.icon}</span>${message}`;
    toast.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });

    setTimeout(() => this.dismiss(toast), duration);
  },

  dismiss(toast) {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 6000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); },
};


// ============================================
// Loading Overlay
// ============================================
const Loader = {
  overlay: null,

  show(message = 'Loading...') {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.id = 'loader-overlay';
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(249,249,249,0.85); backdrop-filter: blur(8px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px;
    `;
    this.overlay.innerHTML = `
      <div style="width: 48px; height: 48px; border: 4px solid #e2e2e2; border-top-color: #00236f;
        border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600;
        color: #00236f; letter-spacing: 0.05em; text-transform: uppercase;">${message}</p>
    `;
    document.body.appendChild(this.overlay);
  },

  hide() {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => { this.overlay?.remove(); this.overlay = null; }, 300);
    }
  }
};


// ============================================
// Modal System
// ============================================
const Modal = {
  show(options = {}) {
    const { title, content, size = 'md', onClose } = options;
    const widths = { sm: '400px', md: '560px', lg: '720px', xl: '900px' };

    const backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,35,111,0.15); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; opacity: 0; transition: opacity 0.3s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 24px; width: 100%; max-width: ${widths[size]};
      max-height: 85vh; overflow-y: auto; box-shadow: 0 32px 64px rgba(0,35,111,0.12);
      transform: translateY(16px); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    if (title) {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 24px 32px; display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid #f3f3f4;
      `;
      header.innerHTML = `
        <h3 style="font-family: Inter, sans-serif; font-weight: 800; font-size: 20px; color: #00236f; margin: 0;">${title}</h3>
        <button id="modal-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px; color: #757682;">
          <span class="material-symbols-outlined">close</span>
        </button>
      `;
      modal.appendChild(header);
    }

    const body = document.createElement('div');
    body.style.cssText = 'padding: 24px 32px;';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
    modal.appendChild(body);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.transform = 'translateY(0)';
    });

    // Close handlers
    const close = () => {
      backdrop.style.opacity = '0';
      modal.style.transform = 'translateY(16px)';
      setTimeout(() => { backdrop.remove(); if (onClose) onClose(); }, 300);
    };

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    modal.querySelector('#modal-close-btn')?.addEventListener('click', close);
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });

    return { close, modal, body };
  },

  confirm(message, onConfirm) {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; color: #444651; line-height: 1.6; margin-bottom: 24px;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="confirm-cancel" style="padding: 10px 24px; border-radius: 12px; border: 1px solid #c5c5d3; 
          background: white; color: #444651; font-weight: 700; font-size: 13px; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;">Cancel</button>
        <button id="confirm-ok" style="padding: 10px 24px; border-radius: 12px; border: none; 
          background: #00236f; color: white; font-weight: 700; font-size: 13px; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;">Confirm</button>
      </div>
    `;
    const { close } = this.show({ title: 'Confirm Action', content: body, size: 'sm' });
    body.querySelector('#confirm-cancel').addEventListener('click', close);
    body.querySelector('#confirm-ok').addEventListener('click', () => { close(); onConfirm(); });
  }
};


// ============================================
// Utility Functions
// ============================================

/**
 * Debounce function for search inputs
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Generate initials from a name
 */
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Create an avatar element (image or initials fallback)
 */
function createAvatar(name, imageUrl, size = 40) {
  if (imageUrl) {
    return `<img src="${imageUrl}" alt="${name}" class="rounded-full object-cover" style="width: ${size}px; height: ${size}px;">`;
  }
  const initials = getInitials(name);
  return `<div class="rounded-full bg-primary flex items-center justify-center text-white font-bold" 
    style="width: ${size}px; height: ${size}px; font-size: ${size * 0.35}px;">${initials}</div>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get URL query parameter
 */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Set page title
 */
function setPageTitle(title) {
  document.title = `${title} | BLB Church`;
}


// ============================================
// Add spinner animation
// ============================================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(styleSheet);
