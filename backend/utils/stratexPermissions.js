'use strict';

const { supabase } = require('../db/supabase');

const SUPER_ADMIN_EMAIL = 'richdhin@stratexanalytics.co.uk';

function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'superadmin') return 'super admin';
  if (raw === 'readonly') return 'read only';
  if (raw === 'productdemo') return 'product demo';
  return raw;
}

function adminEmail(admin, req) {
  return String(
    (admin && admin.email) ||
    (req && req.user && req.user.email) ||
    ''
  ).trim().toLowerCase();
}

function permissionList(admin) {
  if (!admin || !Array.isArray(admin.permissions)) return [];

  return admin.permissions
    .map(item => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

/*
 * Super Admin is an identity rule, not a role label.
 * No database role or permission array can make another person Super Admin.
 */
function isSuperAdmin(admin, req) {
  return adminEmail(admin, req) === SUPER_ADMIN_EMAIL;
}

function isManagementAdmin(admin, req) {
  if (!admin || admin.is_active === false) return false;
  if (isSuperAdmin(admin, req)) return true;

  const role = normalizeRole(
    (admin && (admin.admin_role || admin.role)) ||
    (req && req.user && req.user.role)
  );

  const perms = permissionList(admin);

  return role === 'management' ||
    role === 'operations' ||
    role === 'acquisition' ||
    role === 'safeguarding reviewer' ||
    perms.includes('management');
}

function hasPermission(admin, permission, req) {
  if (!admin || admin.is_active === false) return false;
  if (isSuperAdmin(admin, req)) return true;

  const role = normalizeRole(admin.admin_role || admin.role);
  const perms = permissionList(admin);
  const key = String(permission || '').trim().toLowerCase();

  if (!key) return false;

  /*
   * Reserved permissions can never be delegated. They remain attached to
   * Richdhin's verified Super Admin identity only.
   */
  const reserved = new Set([
    'super_admin',
    'permissions',
    'admin_users',
    'delete_users'
  ]);

  if (reserved.has(key)) return false;
  if (perms.includes(key)) return true;

  const rolePermissions = {
    management: [
      'management',
      'operations',
      'registrations',
      'contact_forms',
      'crm',
      'website_activity',
      'content',
      'leadership',
      'org',
      'contracts',
      'hiring',
      'trust',
      'concerns',
      'showcase',
      'awards',
      'settings',
      'profile'
    ],
    operations: [
      'operations',
      'registrations',
      'contact_forms',
      'crm',
      'website_activity',
      'showcase',
      'awards',
      'content',
      'hiring',
      'contracts',
      'trust',
      'profile'
    ],
    acquisition: [
      'crm',
      'website_activity',
      'contact_forms',
      'hiring',
      'content',
      'profile'
    ],
    'safeguarding reviewer': [
      'trust',
      'concerns',
      'registrations',
      'showcase',
      'awards',
      'profile'
    ],
    employee: [
      'contact_forms',
      'crm',
      'website_activity',
      'profile',
      'settings'
    ],
    'read only': [
      'contact_forms',
      'crm',
      'website_activity',
      'profile',
      'settings'
    ],
    'product demo': [
      'website_activity',
      'profile',
      'settings'
    ]
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

      if (admin && admin.is_active === false) {
        return res.status(403).json({
          error:'This Stratex admin account is inactive.'
        });
      }

      if (!hasPermission(admin, permission, req)) {
        return res.status(403).json({
          error:message ||
            'You do not have permission to perform this Stratex admin action.'
        });
      }

      req.stratexAdmin = admin;
      next();
    } catch (err) {
      console.error('[Stratex permission]', {
        permission,
        code:err.code,
        message:err.message
      });

      res.status(500).json({
        error:'Could not verify Stratex admin permissions.'
      });
    }
  };
}

function requireStratexSuperAdmin(message) {
  return async function stratexSuperAdminMiddleware(req, res, next) {
    try {
      const admin = await loadCurrentStratexAdmin(req);

      if (!admin || admin.is_active === false) {
        return res.status(403).json({
          error:'This Stratex admin account is inactive.'
        });
      }

      if (!isSuperAdmin(admin, req)) {
        return res.status(403).json({
          error:message ||
            'Only Richdhin Inaba can perform this Super Admin action.'
        });
      }

      req.stratexAdmin = admin;
      next();
    } catch (err) {
      console.error('[Stratex Super Admin permission]', {
        code:err.code,
        message:err.message
      });

      res.status(500).json({
        error:'Could not verify Stratex Super Admin access.'
      });
    }
  };
}

module.exports = {
  SUPER_ADMIN_EMAIL,
  hasPermission,
  isManagementAdmin,
  isSuperAdmin,
  loadCurrentStratexAdmin,
  normalizeRole,
  permissionList,
  requireStratexAdminPermission,
  requireStratexSuperAdmin
};
