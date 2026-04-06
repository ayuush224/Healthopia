async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export function fetchBootstrap(filters) {
  const params = new URLSearchParams({
    category: filters.category,
    community: filters.community
  });

  if (filters.search) {
    params.set("search", filters.search);
  }

  return request(`/api/bootstrap?${params.toString()}`);
}

export function createPost(payload) {
  return request("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function togglePostAction(postId, action) {
  return request(`/api/posts/${postId}/${action}`, {
    method: "POST"
  });
}

export function createComment(postId, message) {
  return request(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export function updateTracker(payload) {
  return request("/api/tracker", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
