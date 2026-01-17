export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const request = async (path, options = {}, token) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }

  return response.json();
};

export const apiClient = {
  get: (path, token) => request(path, { method: "GET" }, token),
  post: (path, body, token) =>
    request(
      path,
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      token
    ),
  put: (path, body, token) =>
    request(
      path,
      {
        method: "PUT",
        body: JSON.stringify(body)
      },
      token
    ),
  delete: (path, token) => request(path, { method: "DELETE" }, token)
};

export const uploadFile = async (file, token) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Upload failed");
  }

  return response.json();
};
