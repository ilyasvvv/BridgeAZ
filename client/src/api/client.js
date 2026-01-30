const fallbackBase =
  import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "";
export const API_BASE = import.meta.env.VITE_API_URL || fallbackBase;
if (!API_BASE) {
  throw new Error(
    "Missing VITE_API_URL. Set it in Vercel env vars to https://bridgeaz.onrender.com/api"
  );
}
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
  patch: (path, body, token) =>
    request(
      path,
      {
        method: "PATCH",
        body: JSON.stringify(body)
      },
      token
    ),
  delete: (path, token) => request(path, { method: "DELETE" }, token)
};

export const uploadViaPresign = async ({ file, purpose }, token) => {
  const presign = await apiClient.post(
    "/uploads/presign",
    {
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      purpose
    },
    token
  );

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers || { "Content-Type": file.type },
    body: file
  });
  if (!uploadResponse.ok) {
    throw new Error("Upload failed");
  }

  return presign;
};
