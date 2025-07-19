// Admin utility functions for role-based access control

export const ADMIN_USER_ID = 2;

export function isAdmin(user: any): boolean {
  return user?.id === ADMIN_USER_ID;
}

// Check if the currently effective user (after account switching) is admin
export function isEffectiveAdmin(user: any, switchStatus?: any): boolean {
  if (switchStatus?.isViewingAs) {
    // If viewing as another user, check if that user is admin
    return switchStatus.viewingUser?.id === ADMIN_USER_ID;
  }
  // Otherwise, check the original user
  return user?.id === ADMIN_USER_ID;
}

// Check if the original logged-in user is admin (for showing admin UI controls)
export function isOriginalAdmin(user: any): boolean {
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