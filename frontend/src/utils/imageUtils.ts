/**
 * Helper to construct proper image URLs for team logos and player photos.
 * Handles:
 * - Empty/undefined URLs
 * - Absolute HTTP/HTTPS URLs
 * - Base64 Data URLs
 * - Relative uploaded paths like /uploads/...
 */
export const getImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '';
  }

  const cleanUrl = url.trim();

  // If already absolute or data URL, return as is
  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('data:')
  ) {
    return cleanUrl;
  }

  // Prepend backend host to relative paths (e.g., /uploads/team-logo-xxx.png)
  const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5001/api').replace(
    /\/api\/?$/,
    ''
  );

  return `${apiBase}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};
