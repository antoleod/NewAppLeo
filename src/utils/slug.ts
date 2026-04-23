/**
 * Slug utility for creating friendly URLs
 * Converts strings to URL-friendly slugs
 */

export interface SlugOptions {
  lowercase?: boolean;
  separator?: string;
  maxLength?: number;
  preserveNumbers?: boolean;
  removeSpecialChars?: boolean;
}

/**
 * Create a URL-friendly slug from a string
 * @param text - The text to convert to slug
 * @param options - Configuration options
 * @returns URL-friendly slug
 */
export function createSlug(text: string, options: SlugOptions = {}): string {
  const {
    lowercase = true,
    separator = '-',
    maxLength = 50,
    preserveNumbers = true,
    removeSpecialChars = true
  } = options;

  if (!text || typeof text !== 'string') {
    return '';
  }

  let slug = text
    // Trim whitespace
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Replace spaces and special chars with separator
    .replace(/[^\w\s-]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with separator
    .replace(/\s+/g, separator);

  if (removeSpecialChars) {
    // Remove special characters except letters, numbers, hyphens, and underscores
    slug = slug.replace(/[^a-zA-Z0-9\-_]/g, '');
  }

  if (!preserveNumbers) {
    // Remove numbers
    slug = slug.replace(/[0-9]/g, '');
  }

  // Remove multiple consecutive separators
  slug = slug.replace(new RegExp(`${separator}+`, 'g'), separator);

  // Remove separator from start and end
  slug = slug.replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');

  // Convert to lowercase if requested
  if (lowercase) {
    slug = slug.toLowerCase();
  }

  // Limit length
  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Remove trailing separator if cut off
    slug = slug.replace(new RegExp(`${separator}$`, 'g'), '');
  }

  return slug || 'untitled';
}

/**
 * Create a unique slug by checking against existing slugs
 * @param text - The text to convert to slug
 * @param existingSlugs - Array of existing slugs to check against
 * @param options - Configuration options
 * @returns Unique slug
 */
export function createUniqueSlug(
  text: string, 
  existingSlugs: string[], 
  options: SlugOptions = {}
): string {
  let slug = createSlug(text, options);
  let counter = 1;
  let originalSlug = slug;

  // If slug already exists, append number
  while (existingSlugs.includes(slug)) {
    slug = `${originalSlug}${options.separator || '-'}${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate if a string is a valid slug
 * @param slug - The slug to validate
 * @returns True if valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Check if slug contains only valid characters
  const validSlugPattern = /^[a-z0-9\-_]+$/;
  return validSlugPattern.test(slug);
}

/**
 * Convert a slug back to a readable title
 * @param slug - The slug to convert
 * @returns Readable title
 */
export function slugToTitle(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

/**
 * Generate slugs for different content types
 */
export const slugGenerators = {
  // For baby names
  baby: (name: string, birthDate?: string): string => {
    const baseSlug = createSlug(name);
    const dateSuffix = birthDate ? new Date(birthDate).getFullYear() : '';
    return dateSuffix ? `${baseSlug}-${dateSuffix}` : baseSlug;
  },

  // For medication entries
  medication: (name: string, date?: string): string => {
    const baseSlug = createSlug(name);
    const dateSuffix = date ? new Date(date).toISOString().split('T')[0] : '';
    return dateSuffix ? `${baseSlug}-${dateSuffix}` : baseSlug;
  },

  // For feed entries
  feed: (type: string, date?: string): string => {
    const baseSlug = createSlug(`${type}-feeding`);
    const dateSuffix = date ? new Date(date).toISOString().split('T')[0] : '';
    return dateSuffix ? `${baseSlug}-${dateSuffix}` : baseSlug;
  },

  // For general entries
  entry: (title: string, type: string, date?: string): string => {
    const baseSlug = createSlug(`${type}-${title}`);
    const dateSuffix = date ? new Date(date).toISOString().split('T')[0] : '';
    return dateSuffix ? `${baseSlug}-${dateSuffix}` : baseSlug;
  }
};

/**
 * Default slug configuration for the app
 */
export const DEFAULT_SLUG_OPTIONS: SlugOptions = {
  lowercase: true,
  separator: '-',
  maxLength: 50,
  preserveNumbers: true,
  removeSpecialChars: true
};
