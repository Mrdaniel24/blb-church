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
