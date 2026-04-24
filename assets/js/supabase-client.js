/**
 * BLB Church Digital Management System
 * Supabase Client Configuration
 */

const SUPABASE_URL = 'https://vscjivuatnchqwtcgggn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY2ppdnVhdG5jaHF3dGNnZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTk0OTMsImV4cCI6MjA5MDY5NTQ5M30.AwLLf--l1BWXU7p7OPCJ28y5dxL7g90QSxFrnhe6Iq8';

/**
 * Initialize Supabase client once
 * After this, window.supabase becomes the initialized client.
 */
if (!window.__blbSupabaseClientInitialized) {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase CDN library not loaded. Make sure @supabase/supabase-js is included before supabase-client.js');
  }

  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.__blbSupabaseClientInitialized = true;
}

/**
 * Browser-global alias
 * All files can use `supabase` directly via window.supabase (set above).
 * Do NOT redeclare with const/let — the CDN already exposes `var supabase` globally.
 */

/**
 * Internal profile cache
 */
let __profileCache = null;
let __profileCacheAt = 0;
const PROFILE_CACHE_MS = 15 * 1000;

/**
 * Safely escape HTML
 * @param {any} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get initials from a name
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  const clean = String(name || '').trim();
  if (!clean) return '?';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Normalize unknown numeric values
 * @param {any} value
 * @returns {number}
 */
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Get the current authenticated user session
 * @returns {Promise<Object|null>}
 */
async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error.message);
      return null;
    }

    return data?.session || null;
  } catch (error) {
    console.error('Session exception:', error);
    return null;
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>}
 */
async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('User error:', error.message);
      return null;
    }

    return data?.user || null;
  } catch (error) {
    console.error('User exception:', error);
    return null;
  }
}

/**
 * Clear cached profile
 */
function clearProfileCache() {
  __profileCache = null;
  __profileCacheAt = 0;
}

/**
 * Get the current user's profile
 * @param {boolean} forceRefresh
 * @returns {Promise<Object|null>}
 */
async function getUserProfile(forceRefresh = false) {
  try {
    const now = Date.now();
    if (!forceRefresh && __profileCache && (now - __profileCacheAt) < PROFILE_CACHE_MS) {
      return __profileCache;
    }

    const session = await getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*, departments(id, name)')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error.message);
      return null;
    }

    __profileCache = data || null;
    __profileCacheAt = now;

    return __profileCache;
  } catch (error) {
    console.error('Profile fetch exception:', error);
    return null;
  }
}

/**
 * Get the current user's role
 * @returns {Promise<string|null>}
 */
async function getUserRole() {
  const profile = await getUserProfile();
  return profile?.role || null;
}

/**
 * Get admin permissions for current user
 * super_admin gets full access automatically.
 *
 * Expected table: admin_permissions
 * @returns {Promise<Object|null>}
 */
async function getAdminPermissions() {
  try {
    const session = await getSession();
    if (!session?.user) return null;

    const profile = await getUserProfile();
    if (!profile) return null;

    if (profile.role === 'super_admin') {
      return {
        all: true,
        role: 'super_admin',
        admin_id: session.user.id,
        department_id: null,
        can_manage_members: true,
        can_manage_contributions: true,
        can_view_all_contributions: true,
        can_manage_events: true,
        can_manage_announcements: true,
        can_manage_media: true,
        can_manage_sermons: true,
        can_manage_departments: true,
        can_view_reports: true,
      };
    }

    if (profile.role !== 'admin') {
      return null;
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('admin_id', session.user.id)
      .single();

    const PERM_DEFAULTS = {
      all: false,
      role: profile.role,
      admin_id: session.user.id,
      department_id: null,
      can_manage_members: false,
      can_manage_contributions: false,
      can_view_all_contributions: false,
      can_manage_events: false,
      can_manage_announcements: false,
      can_manage_media: false,
      can_manage_sermons: false,
      can_manage_departments: false,
      can_view_reports: false,
    };

    if (error) {
      if (error.code === 'PGRST116') return PERM_DEFAULTS;
      console.error('Permissions fetch error:', error.message);
      return null;
    }

    return { ...PERM_DEFAULTS, ...data, all: false, role: profile.role };
  } catch (error) {
    console.error('getAdminPermissions exception:', error);
    return null;
  }
}

/**
 * Check whether permissions include a module
 * @param {Object|null} perms
 * @param {string} key
 * @returns {boolean}
 */
function hasPermission(perms, key) {
  if (!perms) return false;
  if (perms.all) return true;
  return !!perms[key];
}

/**
 * Check whether admin is limited to one department
 * @param {Object|null} perms
 * @returns {boolean}
 */
function isScopedToDepartment(perms) {
  if (!perms) return false;
  if (perms.all) return false;
  return !!perms.department_id;
}

/**
 * Check if current profile can access a required role
 * Hierarchy:
 * member < admin < super_admin
 *
 * @param {string|null} userRole
 * @param {string|null} requiredRole
 * @returns {boolean}
 */
function roleMeetsRequirement(userRole, requiredRole) {
  const levels = {
    member: 1,
    admin: 2,
    super_admin: 3
  };

  const actual = levels[userRole] || 0;
  const required = levels[requiredRole] || 0;

  return actual >= required;
}

/**
 * Get public URL for storage file
 * @param {string} bucket
 * @param {string} path
 * @returns {string|null}
 */
function getStorageUrl(bucket, path) {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Storage URL error:', error);
    return null;
  }
}

/**
 * Upload file to storage
 * @param {string} bucket
 * @param {string} path
 * @param {File|Blob} file
 * @returns {Promise<Object>}
 */
async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return data;
}

/**
 * Remove file from storage
 * @param {string} bucket
 * @param {string[]} paths
 * @returns {Promise<Object>}
 */
async function removeFiles(bucket, paths) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) throw error;
  return data;
}

/**
 * Format currency amount in TZS
 * @param {number} amount
 * @returns {string}
 */
function formatTZS(amount) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(toNumber(amount));
}

/**
 * Format date
 * @param {string|Date} dateStr
 * @param {Object} options
 * @returns {string}
 */
function formatDate(dateStr, options = {}) {
  if (!dateStr) return '—';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', { ...defaults, ...options });
}

/**
 * Format date with time
 * @param {string|Date} dateStr
 * @returns {string}
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Relative time helper
 * @param {string|Date} dateStr
 * @returns {string}
 */
function timeAgo(dateStr) {
  if (!dateStr) return '—';

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return '—';

  const seconds = Math.floor((Date.now() - target.getTime()) / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

/**
 * Generate safe filename
 * @param {string} originalName
 * @returns {string}
 */
function generateFileName(originalName = 'file') {
  const ext = String(originalName).includes('.')
    ? '.' + String(originalName).split('.').pop().toLowerCase()
    : '';

  const base = String(originalName)
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'file';

  return `${base}-${Date.now()}${ext}`;
}

/**
 * Expose helpers globally
 * window.supabase is already the initialized client (set in the block above).
 */
window.getSession = getSession;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.getUserRole = getUserRole;
window.getAdminPermissions = getAdminPermissions;
window.hasPermission = hasPermission;
window.isScopedToDepartment = isScopedToDepartment;
window.roleMeetsRequirement = roleMeetsRequirement;
window.getStorageUrl = getStorageUrl;
window.uploadFile = uploadFile;
window.removeFiles = removeFiles;
window.formatTZS = formatTZS;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.timeAgo = timeAgo;
window.escapeHtml = escapeHtml;
window.getInitials = getInitials;
window.generateFileName = generateFileName;
window.clearProfileCache = clearProfileCache;