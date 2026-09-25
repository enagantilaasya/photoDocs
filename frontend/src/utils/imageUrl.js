export const DEFAULT_PHOTO_PLACEHOLDER =
  'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?w=1200&auto=format&fit=crop&q=80';

const RENDER_BASE = 'https://photodocs.onrender.com';

/**
 * Resolves a safe, HTTPS, absolute or relative image URL.
 * Prevents mixed content blocks on HTTPS sites (e.g. Vercel) and handles relative paths.
 */
export const getSafeImageUrl = (photoOrUrl) => {
  if (!photoOrUrl) {
    return DEFAULT_PHOTO_PLACEHOLDER;
  }

  let rawUrl = '';
  if (typeof photoOrUrl === 'string') {
    rawUrl = photoOrUrl;
  } else if (typeof photoOrUrl === 'object') {
    rawUrl = photoOrUrl.url || photoOrUrl.secure_url || photoOrUrl.path || '';
  }

  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_PHOTO_PLACEHOLDER;
  }

  let cleanUrl = rawUrl.trim();

  // If pointing to photodocs.onrender.com over http, upgrade to https
  if (cleanUrl.startsWith('http://photodocs.onrender.com')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // If current page is HTTPS and URL is HTTP, upgrade to HTTPS to avoid browser Mixed Content blocking
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    cleanUrl.startsWith('http://')
  ) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  // If URL is a relative path like /uploads/... or /api/...
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('/api/')) {
    const apiHost = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : (import.meta.env.PROD ? RENDER_BASE : '');
    cleanUrl = `${apiHost}${cleanUrl}`;
  }

  return cleanUrl;
};
