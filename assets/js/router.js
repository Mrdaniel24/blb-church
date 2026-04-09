/**
 * BLB Church Digital Management System
 * Route Guard / Page Protection
 * 
 * Include this script on any protected page.
 * It checks auth session and role, then redirects unauthorized users.
 * 
 * Usage: Add data-required-role attribute to <body> tag:
 *   <body data-required-role="member">       → member, admin, super_admin can access
 *   <body data-required-role="admin">         → admin, super_admin can access
 *   <body data-required-role="super_admin">   → super_admin only
 */

const ROLE_HIERARCHY = {
  'member': 1,
  'admin': 2,
  'super_admin': 3
};

/**
 * Check if a user role has sufficient access for a required role
 * @param {string} userRole - The user's actual role
 * @param {string} requiredRole - The minimum role needed
 * @returns {boolean}
 */
function hasAccess(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

/**
 * Initialize page protection
 * Call this at the top of every protected page
 */
async function initPageGuard() {
  // Show loading state
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';

  const session = await getSession();
  
  if (!session) {
    // Not logged in — redirect to login
    window.location.href = '/public/login.html';
    return null;
  }

  // Get user profile
  const profile = await getUserProfile();
  
  if (!profile) {
    window.location.href = '/public/login.html';
    return null;
  }

  // Check if account is active
  if (profile.status !== 'active') {
    await supabase.auth.signOut();   // supabase is defined in supabase-client.js
    window.location.href = '/public/login.html?error=inactive';
    return null;
  }

  // Check role access
  const requiredRole = document.body.dataset.requiredRole || 'member';
  
  if (!hasAccess(profile.role, requiredRole)) {
    // Redirect to their actual dashboard instead
    redirectToDashboard(profile.role);
    return null;
  }

  // Authorized — reveal page
  document.body.style.opacity = '1';
  
  // Populate common UI elements
  populateUserUI(profile);

  return profile;
}

/**
 * Populate common UI elements with user data
 * Looks for elements with specific data attributes
 * @param {Object} profile - The user profile object
 */
function populateUserUI(profile) {
  // User name elements
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = profile.full_name || 'User';
  });

  // User email elements
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = profile.email;
  });

  // User role elements
  document.querySelectorAll('[data-user-role]').forEach(el => {
    const roleLabels = {
      'member': 'Member',
      'admin': 'Administrator',
      'super_admin': 'Super Admin'
    };
    el.textContent = roleLabels[profile.role] || profile.role;
  });

  // User avatar elements
  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    if (profile.avatar_url) {
      el.src = profile.avatar_url;
    }
  });

  // User department
  document.querySelectorAll('[data-user-department]').forEach(el => {
    el.textContent = profile.departments?.name || 'No Department';
  });

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  });

  // Set active nav link based on current page
  setActiveNavLink();
}

/**
 * Highlight the active navigation link
 * Matches the current URL path against nav href attributes
 */
function setActiveNavLink() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('nav a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href.replace('./', '').replace('../', ''))) {
      link.classList.add('active-nav');
    }
  });
}

/**
 * Listen for auth state changes (logout from another tab, etc.)
 */
window.supabase.auth.onAuthStateChange((event, _session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = '/public/login.html';
  }
});
