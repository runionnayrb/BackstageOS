// Server-side admin utility functions
export const ADMIN_USER_ID = '2';

export function isAdmin(userId: string): boolean {
  return userId === ADMIN_USER_ID;
}

export function requireAdmin(userId: string): void {
  if (!isAdmin(userId)) {
    throw new Error('Admin access required');
  }
}