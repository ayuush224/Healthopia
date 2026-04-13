const ACCENT_COUNT = 5;

function hashString(value) {
  return Array.from(String(value || '')).reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function getAccentVars(value) {
  const accentIndex = (hashString(value) % ACCENT_COUNT) + 1;
  return `--accent-bg:var(--accent-${accentIndex}-bg);--accent-text:var(--accent-${accentIndex}-text);--accent-dot:var(--accent-${accentIndex}-dot);`;
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatCompactNumber(value = 0) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function formatRelativeTime(value) {
  if (!value) {
    return 'Just now';
  }

  const timestamp = new Date(value).getTime();
  const diffSeconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

export function formatWater(value = 0) {
  if (!value) {
    return '0 L';
  }

  return `${(value / 1000).toFixed(1)} L`;
}

export function getInitials(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return 'SH';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function renderAvatar(entity, size = 'default') {
  const name = entity?.name || entity?.communityName || entity?.username || 'Soft Health';
  const accentVars = getAccentVars(name);
  const sizeClass = size === 'small' ? 'avatar avatar--small' : size === 'large' ? 'avatar avatar--large' : 'avatar';
  const initials = escapeHtml(getInitials(name));

  return `<span class="${sizeClass}" style="${accentVars}"><span>${initials}</span></span>`;
}

export function matchesSearch(post, query) {
  const searchableValue = [
    post.title,
    post.body,
    post.description,
    post.user?.name,
    post.user?.username,
    post.createdBy?.name,
    post.createdBy?.username,
    post.community?.communityName,
    post.communityId?.communityName,
    ...(post.tags || []),
    ...(post.comments || []).map((comment) => comment.description)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableValue.includes(query.toLowerCase());
}
