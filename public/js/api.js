export async function apiFetch(url, options = {}) {
  const config = {
    credentials: 'include',
    headers: {},
    ...options
  };

  if (options.body && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, config);
  const rawText = await response.text();
  let payload = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (_error) {
      payload = { message: rawText };
    }
  }

  if (response.status === 401) {
    window.location.href = '/sign-in';
    throw new Error(payload.message || 'Authentication required.');
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Something went wrong.');
  }

  return payload;
}
