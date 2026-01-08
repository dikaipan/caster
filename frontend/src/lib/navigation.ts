/**
 * Navigation utilities for role-based redirects
 */

interface User {
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
 * Get the default landing page for a user based on their role
 * @param user - The authenticated user object
 * @returns The path to redirect to
 */
export function getDefaultLandingPage(user: User | null): string {
  if (!user) {
    return '/login';
  }

  // Hitachi users (SUPER_ADMIN, RC_MANAGER, RC_STAFF) → Dashboard
  if (user.userType === 'HITACHI') {
    return '/dashboard';
  }

  // Pengelola/Vendor users → Tickets page (main workflow)
  if (user.userType === 'PENGELOLA') {
    return '/tickets';
  }

  // Bank users → Dashboard (read-only)
  if (user.userType === 'BANK') {
    return '/dashboard';
  }

  // Default fallback → Dashboard
  return '/dashboard';
}

/**
 * Check if user should be redirected after login
 * @param user - The authenticated user object
 * @returns true if user should be redirected
 */
export function shouldRedirectAfterLogin(user: User | null): boolean {
  return user !== null && user.userType !== undefined;
}

