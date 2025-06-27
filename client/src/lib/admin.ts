// Admin utility functions for role-based access control

export const ADMIN_USER_ID = 2;

export function isAdmin(user: any): boolean {
  return user?.id === ADMIN_USER_ID;
}

export function requireAdmin(user: any): void {
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
}

export function hasAdminAccess(user: any): boolean {
  return isAdmin(user);
}