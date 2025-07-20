// Centralized show slug to name mapping
// Change these variables to update show names throughout the entire app

export const SHOW_SLUGS = {
  // Current shows
  'hamlet': 'Hamlet',
  'macbeth': 'Macbeth', 
  'spring-awakening': 'Spring Awakening',
  'test-show': 'Test Show',
  
  // Add new shows here as needed
  // 'my-new-show': 'My New Show Title',
} as const;

// Type for valid slug keys
export type ShowSlug = keyof typeof SHOW_SLUGS;

// Helper function to get show name from slug
export function getShowNameFromSlug(slug: string): string {
  return SHOW_SLUGS[slug as ShowSlug] || slug;
}

// Helper function to get slug from show name (reverse lookup)
export function getSlugFromShowName(name: string): string {
  const entry = Object.entries(SHOW_SLUGS).find(([, showName]) => showName === name);
  return entry ? entry[0] : name.toLowerCase().replace(/\s+/g, '-');
}

// Get all available slugs
export function getAllShowSlugs(): string[] {
  return Object.keys(SHOW_SLUGS);
}

// Get all available show names
export function getAllShowNames(): string[] {
  return Object.values(SHOW_SLUGS);
}

// Validate if a slug exists
export function isValidShowSlug(slug: string): slug is ShowSlug {
  return slug in SHOW_SLUGS;
}