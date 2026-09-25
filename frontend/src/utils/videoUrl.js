const RENDER_BASE = 'https://photodocs.onrender.com';

/**
 * Normalizes video URL and upgrades HTTP to HTTPS
 */
export const getSafeVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();

  if (cleanUrl.startsWith('http://photodocs.onrender.com')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    cleanUrl.startsWith('http://')
  ) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('/api/')) {
    const apiHost = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : (import.meta.env.PROD ? RENDER_BASE : '');
    cleanUrl = `${apiHost}${cleanUrl}`;
  }

  return cleanUrl;
};

/**
 * Checks if a URL is a YouTube video and extracts the embed URL
 */
export const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&modestbranding=1`;
  }
  return null;
};

/**
 * Checks if a URL is a Vimeo video and extracts the embed URL
 */
export const getVimeoEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/;
  const match = url.match(regExp);

  if (match && match[1]) {
    return `https://player.vimeo.com/video/${match[1]}?dnt=1&app_id=122963`;
  }
  return null;
};

/**
 * Determines video player type: 'youtube' | 'vimeo' | 'html5'
 */
export const detectVideoType = (video) => {
  const url = typeof video === 'string' ? video : video?.url || '';
  if (getYouTubeEmbedUrl(url)) return 'youtube';
  if (getVimeoEmbedUrl(url)) return 'vimeo';
  return 'html5';
};
