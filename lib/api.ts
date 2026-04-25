const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://bridgeaz.onrender.com/api"
    : "http://localhost:5001/api");

export const API_BASE = normalizeApiBase(RAW_API_BASE);

export type ApiError = Error & { status?: number; code?: string };

const TOKEN_KEY = "bc_token";
const DEFAULT_TIMEOUT_MS = 15000;

function normalizeApiBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://bridgeaz.onrender.com/api";

  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    if (trimmed === "" || trimmed === "/") return "/api";
  }

  return trimmed;
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const { auth = true, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      signal: controller.signal,
    });
  } catch (error: any) {
    const err = new Error(
      error?.name === "AbortError"
        ? "The server did not respond in time. Please try again."
        : error?.message || "Network request failed"
    ) as ApiError;
    err.code = error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!res.ok) {
    let payload: any = {};
    try {
      payload = await res.json();
    } catch {}
    const err = new Error(payload.message || `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    err.code = payload.code;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean; signal?: AbortSignal }) =>
    request<T>(path, { method: "GET", auth: opts?.auth, signal: opts?.signal }),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, {
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
    }),
  put: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, {
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
    }),
  patch: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
    request<T>(path, {
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
    }),
  delete: <T>(path: string, opts?: { auth?: boolean }) =>
    request<T>(path, { method: "DELETE", auth: opts?.auth }),
};
