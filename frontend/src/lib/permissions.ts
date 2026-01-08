/**
 * Permission utility functions for role-based access control
 * 
 * IMPORTANT: These functions ensure consistent permission checks across the application.
 * Always use these functions instead of inline permission checks to avoid security issues.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  userType: 'HITACHI' | 'PENGELOLA' | 'BANK';
  pengelolaId?: string;
  customerBankId?: string;
  department?: string;
  phone?: string;
}

/**
 * Check if user is a Hitachi user
 */
export function isHitachiUser(user: User | null): boolean {
  return user?.userType === 'HITACHI';
}

/**
 * Check if user is a Pengelola user
 */
export function isPengelolaUser(user: User | null): boolean {
  return user?.userType === 'PENGELOLA';
}

/**
 * Check if user is a Bank user
 */
export function isBankUser(user: User | null): boolean {
  return user?.userType === 'BANK';
}

/**
 * Check if user is Super Admin (Hitachi only)
 * Only Hitachi users with SUPER_ADMIN role are considered Super Admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return isHitachiUser(user) && user?.role === 'SUPER_ADMIN';
}

/**
 * Check if user is RC Manager (Hitachi only)
 */
export function isRCManager(user: User | null): boolean {
  return isHitachiUser(user) && user?.role === 'RC_MANAGER';
}

/**
 * Check if user is RC Staff (Hitachi only)
 */
export function isRCStaff(user: User | null): boolean {
  return isHitachiUser(user) && user?.role === 'RC_STAFF';
}

/**
 * Check if user is Admin (Hitachi Super Admin or RC Manager)
 * This is the main admin check - only Hitachi users with admin roles can access admin features
 * 
 * IMPORTANT: Pengelola ADMIN is NOT considered admin for system-wide admin features
 */
export function isAdmin(user: User | null): boolean {
  return isSuperAdmin(user) || isRCManager(user);
}

/**
 * Check if user is Pengelola Admin
 * Pengelola users with ADMIN role can manage their own pengelola users
 */
export function isPengelolaAdmin(user: User | null): boolean {
  return isPengelolaUser(user) && user?.role === 'ADMIN';
}

/**
 * Check if user can manage Hitachi users
 * Only Hitachi Super Admin can manage Hitachi users
 */
export function canManageHitachiUsers(user: User | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Check if user can manage Pengelola users
 * Hitachi Super Admin or Pengelola Admin can manage Pengelola users
 */
export function canManagePengelolaUsers(user: User | null): boolean {
  return isSuperAdmin(user) || isPengelolaAdmin(user);
}

/**
 * Check if user can access admin settings
 * Only Hitachi Super Admin and RC Manager can access admin settings
 */
export function canAccessAdminSettings(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can access repair center features
 * Only Hitachi users (RC_STAFF, RC_MANAGER, SUPER_ADMIN) can access repair features
 */
export function canAccessRepairCenter(user: User | null): boolean {
  return isHitachiUser(user) && (
    user?.role === 'RC_STAFF' ||
    user?.role === 'RC_MANAGER' ||
    user?.role === 'SUPER_ADMIN'
  );
}

/**
 * Check if user can view audit logs
 * Only Hitachi Super Admin can view audit logs
 */
export function canViewAuditLogs(user: User | null): boolean {
  return isSuperAdmin(user);
}

