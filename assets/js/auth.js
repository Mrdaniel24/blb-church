/**
 * BLB Church Digital Management System
 * Authentication Module
 */

async function registerUser(userData) {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      gender,
      marital_status,
      date_of_birth,
      department_id,
      address
    } = userData;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ''
        }
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData?.user) {
      return { success: false, error: 'Account creation failed. Please try again.' };
    }

    const profileData = {
      id: authData.user.id,
      email: email,
      full_name: full_name || null,
      phone: phone || null,
      gender: gender || null,
      marital_status: marital_status || null,
      date_of_birth: date_of_birth || null,
      department_id: department_id || null,
      address: address || null,
      role: 'member',
      status: 'active'
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      return { success: false, error: 'Profile save failed: ' + profileError.message };
    }

    clearProfileCache?.();

    return { success: true, user: authData.user };
  } catch (e) {
    return { success: false, error: e.message || 'Registration failed unexpectedly.' };
  }
}

async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Supabase signInWithPassword error:', {
        code: error.code,
        message: error.message,
        status: error.status
      });

      return { success: false, error: `${error.code}: ${error.message}` };
    }

    clearProfileCache?.();

    return {
      success: true,
      session: data.session,
      user: data.user
    };
  } catch (e) {
    console.error('Login exception:', e);
    return { success: false, error: e.message || 'Login failed unexpectedly.' };
  }
}

async function logoutUser() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    clearProfileCache?.();
    window.location.href = getAbsolutePath('/public/login.html');
  }
}

function getAbsolutePath(path) {
  return `${window.location.origin}${path}`;
}

function redirectToDashboard(role) {
  switch (role) {
    case 'super_admin':
      window.location.href = getAbsolutePath('/super-admin/dashboard.html');
      break;
    case 'admin':
      window.location.href = getAbsolutePath('/admin/dashboard.html');
      break;
    default:
      window.location.href = getAbsolutePath('/member/dashboard.html');
      break;
  }
}

function canAccessRole(userRole, requiredRole) {
  return roleMeetsRequirement(userRole, requiredRole);
}

async function handleLogin(email, password) {
  const result = await loginUser(email, password);
  if (!result.success) return result;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status, full_name, email')
      .eq('id', result.user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        error: 'Could not fetch your profile. ' + profileError.message
      };
    }

    if (!profile) {
      return { success: false, error: 'Your profile was not found.' };
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      clearProfileCache?.();
      return {
        success: false,
        error: 'Your account is ' + profile.status + '. Contact the church office.'
      };
    }

    clearProfileCache?.();
    redirectToDashboard(profile.role || 'member');

    return {
      success: true,
      role: profile.role
    };
  } catch (e) {
    return { success: false, error: e.message || 'Login flow failed unexpectedly.' };
  }
}

async function handleRegistration(formData) {
  try {
    const result = await registerUser(formData);
    if (!result.success) return result;

    // Try auto-login — this may fail if email confirmation is enabled
    const loginResult = await loginUser(formData.email, formData.password);
    if (!loginResult.success) {
      // Registration succeeded but auto-login failed (email confirmation required)
      // Redirect to login with a success message
      window.location.href = getAbsolutePath('/public/login.html?registered=1');
      return { success: true, needsConfirmation: true };
    }

    clearProfileCache?.();
    redirectToDashboard('member');

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'Unexpected registration error.' };
  }
}

async function redirectIfLoggedIn() {
  try {
    const session = await getSession();
    if (!session) return;

    const profile = await getUserProfile(true);
    if (!profile) return;

    if (profile.status && profile.status !== 'active') {
      await logoutUser();
      return;
    }

    redirectToDashboard(profile.role || 'member');
  } catch (e) {
    console.error('redirectIfLoggedIn error:', e);
  }
}

/**
 * Page guard using body[data-required-role]
 *
 * Examples:
 * <body data-required-role="admin">
 * <body data-required-role="super_admin">
 *
 * Rules:
 * - super_admin can access admin pages
 * - admin cannot access super_admin pages
 * - inactive users are signed out
 *
 * @returns {Promise<Object|null>} profile
 */
async function initPageGuard() {
  try {
    const session = await getSession();

    if (!session?.user) {
      window.location.href = getAbsolutePath('/public/login.html');
      return null;
    }

    const profile = await getUserProfile(true);

    if (!profile) {
      await supabase.auth.signOut();
      clearProfileCache?.();
      window.location.href = getAbsolutePath('/public/login.html');
      return null;
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      clearProfileCache?.();
      if (typeof Toast !== 'undefined') {
        Toast.error('Your account is inactive.');
      }
      window.location.href = getAbsolutePath('/public/login.html');
      return null;
    }

    const requiredRole = document.body?.dataset?.requiredRole || null;
    const userRole = profile.role || 'member';

    if (requiredRole && !canAccessRole(userRole, requiredRole)) {
      if (typeof Toast !== 'undefined') {
        Toast.error('You do not have permission to access this page.');
      }
      redirectToDashboard(userRole);
      return null;
    }

    hydrateUserIdentity(profile);

    // Hide nav items the user has no permission for
    if (profile.role === 'admin') {
      const perms = await getAdminPermissions();
      applyNavPermissions(perms);
    }

    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });

    return profile;
  } catch (e) {
    console.error('initPageGuard error:', e);
    window.location.href = getAbsolutePath('/public/login.html');
    return null;
  }
}

/**
 * Fill common user placeholders if present in page
 * Supports:
 * [data-user-name]
 * [data-user-role]
 */
function hydrateUserIdentity(profile) {
  try {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = profile.full_name || profile.email || 'User';
    });

    document.querySelectorAll('[data-user-role]').forEach(el => {
      const role = profile.role || 'member';
      el.textContent = prettyRole(role);
    });
  } catch (e) {
    console.error('hydrateUserIdentity error:', e);
  }
}

function prettyRole(role) {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Administrator';
    case 'member': return 'Member';
    default:
      return String(role || 'User')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, ch => ch.toUpperCase());
  }
}

/**
 * Hide nav links tagged with data-perm="<key>" when user lacks that permission.
 * Called automatically by initPageGuard() for admin-role users.
 * @param {Object|null} perms
 */
function applyNavPermissions(perms) {
  document.querySelectorAll('[data-perm]').forEach(el => {
    const key = el.dataset.perm;
    if (!hasPermission(perms, key)) {
      el.style.display = 'none';
    }
  });
}

/**
 * Optional page-level permission enforcement
 * Example:
 * await requireModulePermission('can_manage_members');
 *
 * @param {string} permissionKey
 * @returns {Promise<boolean>}
 */
async function requireModulePermission(permissionKey) {
  try {
    const perms = await getAdminPermissions();

    if (!perms) {
      if (typeof Toast !== 'undefined') {
        Toast.error('Permission record not found.');
      }
      const role = await getUserRole();
      redirectToDashboard(role || 'member');
      return false;
    }

    if (!hasPermission(perms, permissionKey)) {
      if (typeof Toast !== 'undefined') {
        Toast.error('You are not allowed to access this section.');
      }
      const role = await getUserRole();
      redirectToDashboard(role || 'member');
      return false;
    }

    return true;
  } catch (e) {
    console.error('requireModulePermission error:', e);
    return false;
  }
}

/**
 * Optional helper:
 * applies department filter if needed
 *
 * usage:
 * let query = supabase.from('profiles').select('*');
 * query = await applyDepartmentScope(query);
 *
 * @param {any} query
 * @param {string} [columnName='department_id']
 * @returns {Promise<any>}
 */
async function applyDepartmentScope(query, columnName = 'department_id') {
  const perms = await getAdminPermissions();
  if (isScopedToDepartment(perms)) {
    return query.eq(columnName, perms.department_id);
  }
  return query;
}

/**
 * Auto-bind logout buttons:
 * any element with [data-action="logout"]
 */
document.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-action="logout"]');
  if (!trigger) return;

  event.preventDefault();
  await logoutUser();
});

/**
 * Keep cache fresh on auth changes
 */
supabase.auth.onAuthStateChange((_event) => {
  clearProfileCache?.();
});

/**
 * Expose globally
 */
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.handleLogin = handleLogin;
window.handleRegistration = handleRegistration;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.redirectToDashboard = redirectToDashboard;
window.initPageGuard = initPageGuard;
window.applyNavPermissions = applyNavPermissions;
window.requireModulePermission = requireModulePermission;
window.applyDepartmentScope = applyDepartmentScope;
window.canAccessRole = canAccessRole;
window.prettyRole = prettyRole;
window.hydrateUserIdentity = hydrateUserIdentity;