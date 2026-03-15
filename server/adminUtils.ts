// Server-side admin utility functions
// Admin access is determined by the isAdmin field on the user object

// Check if user is admin from user object (Express req.user)
export function isAdminUser(user: any): boolean {
  return user?.isAdmin === true;
}

// Backward-compatible admin check - accepts either:
// 1. A user object with isAdmin boolean (preferred)
// 2. A legacy userId string (looks up in passed context or defaults to checking object)
export function isAdmin(userOrId: any): boolean {
  // If passed a user object with isAdmin property, use that
  if (typeof userOrId === 'object' && userOrId !== null) {
    return userOrId.isAdmin === true;
  }
  // Legacy: string userId was passed
  // Cannot determine admin status from ID alone without DB lookup
  // Return false for safety - routes should use user object instead
  // This maintains security: unknown IDs are denied rather than granted
  return false;
}

export function requireAdmin(user: any): void {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required');
  }
}

// Middleware function to require admin access (includes authentication check)
export function requireAdminMiddleware(req: any, res: any, next: any): void {
  // First check authentication
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Then check admin role
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
}
