// Admin utility functions for role-based access control
// Admin access is determined by the isAdmin boolean field on the user object

export function isAdmin(user: any): boolean {
  return user?.isAdmin === true;
}

// Check if the currently effective user (after account switching) is admin
export function isEffectiveAdmin(user: any, switchStatus?: any): boolean {
  if (switchStatus?.isViewingAs) {
    // If viewing as another user, check if that user is admin
    return switchStatus.viewingUser?.isAdmin === true;
  }
  // Otherwise, check the original user
  return user?.isAdmin === true;
}

// Check if the original logged-in user is admin (for showing admin UI controls)
export function isOriginalAdmin(user: any): boolean {
  return user?.isAdmin === true;
}

export function requireAdmin(user: any): void {
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
}

export function hasAdminAccess(user: any): boolean {
  return isAdmin(user);
}
