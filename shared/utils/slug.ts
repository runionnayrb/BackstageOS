/**
 * Utility functions for generating URL-friendly slugs from project names
 */

/**
 * Generate a URL-friendly slug from a project name
 * @param name - The project name to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Limit length to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if truncation created one
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by adding a number suffix if needed
 * @param name - The project name to convert to a slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique URL-friendly slug
 */
export function generateUniqueSlug(name: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(name);
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Check if a string is a valid slug format
 * @param slug - The string to validate
 * @returns True if the string is a valid slug
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Check if a string looks like a numeric ID (for backward compatibility)
 * @param param - The URL parameter to check
 * @returns True if the parameter looks like a numeric ID
 */
export function isNumericId(param: string): boolean {
  return /^\d+$/.test(param);
}