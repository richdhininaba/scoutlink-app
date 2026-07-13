'use strict';

const { supabase } = require('../db/supabase');

const MANAGEMENT_EMAILS = new Set([
  'richdhin@stratexanalytics.co.uk'
]);

function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'superadmin') return 'super admin';
  if (raw === 'readonly') return 'read only';
  if (raw === 'productdemo') return 'product demo';
  return raw;
}

function permissionList(admin) {
  if (!admin || !Array.isArray(admin.permissions)) return [];
  return admin.permissions.map(item => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function isManagementAdmin(admin, req) {
  const email = String((admin && admin.email) || (req && req.user && req.user.email) || '').toLowerCase();
  const role = normalizeRole((admin && (admin.admin_role || admin.role)) || (req && req.user && req.user.role));
  const perms = permissionList(admin);
  return MANAGEMENT_EMAILS.has(email) ||
    role === 'management' ||
    role === 'super admin' ||
    role === 'founder' ||
    perms.includes('management') ||
    perms.includes('super_admin') ||
    perms.includes('permissions') ||
    perms.includes('admin_users');
}

function hasPermission(admin, permission, req) {
  if (!admin || admin.is_active === false) return false;
  if (isManagementAdmin(admin, req)) return true;
  const role = normalizeRole(admin.admin_role || admin.role);
  const perms = permissionList(admin);
  const key = String(permission || '').trim().toLowerCase();
  if (!key) return false;
  if (perms.includes(key)) return true;

  const rolePermissions = {
    operations: ['operations', 'registrations', 'contact_forms', 'crm', 'website_activity', 'showcase', 'awards', 'content', 'hiring', 'contracts', 'trust'],
    acquisition: ['crm', 'website_activity', 'contact_forms', 'hiring', 'content'],
    'safeguarding reviewer': ['trust', 'concerns', 'showcase', 'awards'],
    employee: ['contact_forms', 'crm', 'website_activity', 'profile', 'settings'],
    'read only': ['contact_forms', 'crm', 'website_activity', 'profile', 'settings'],
    'product demo': ['website_activity', 'profile', 'settings']
  };

  return (rolePermissions[role] || []).includes(key);
}

async function loadCurrentStratexAdmin(req) {
  const id = req && req.user && req.user.id;
  if (!id) return null;
  const { data, error } = await supabase
    .from('stratex')
    .select('id,email,admin_role,role,permissions,is_active,manager_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function requireStratexAdminPermission(permission, message) {
  return async function stratexPermissionMiddleware(req, res, next) {
    try {
      const admin = await loadCurrentStratexAdmin(req);
      if (admin && admin.is_active === false) return res.status(403).json({ error: 'This Stratex admin account is inactive.' });
      if (!hasPermission(admin, permission, req)) {
        return res.status(403).json({ error: message || 'You do not have permission to perform this Stratex admin action.' });
      }
      req.stratexAdmin = admin;
      next();
    } catch (err) {
      console.error('[Stratex permission]', { permission, code: err.code, message: err.message });
      res.status(500).json({ error: 'Could not verify Stratex admin permissions.' });
    }
  };
}

module.exports = {
  hasPermission,
  isManagementAdmin,
  loadCurrentStratexAdmin,
  normalizeRole,
  requireStratexAdminPermission
};
