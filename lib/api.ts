const PRODUCTION_API_BASE = "https://bridgeaz.onrender.com/api";
const DEVELOPMENT_API_BASE = "http://localhost:5001/api";

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? PRODUCTION_API_BASE
    : DEVELOPMENT_API_BASE);

export const API_BASE = normalizeApiBase(RAW_API_BASE);

export type ApiError = Error & { status?: number; code?: string };

const TOKEN_KEY = "bc_token";
const DEFAULT_TIMEOUT_MS = 15000;
export const AUTH_TIMEOUT_MS = 45000;

function normalizeApiBase(value: string): string {
  const fallback = process.env.NODE_ENV === "production"
    ? PRODUCTION_API_BASE
    : DEVELOPMENT_API_BASE;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed);
    if (
      process.env.NODE_ENV === "production" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      return PRODUCTION_API_BASE;
    }
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api";
      return url.toString().replace(/\/+$/, "");
    }
    if (!url.pathname.endsWith("/api")) return url.toString().replace(/\/+$/, "");
    return url.toString().replace(/\/+$/, "");
  } catch {
    if (trimmed === "/api" || trimmed.startsWith("/api/")) return trimmed;
    return fallback;
  }
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

export async function warmApi(timeoutMs = 8000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

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
  get: <T>(
    path: string,
    opts?: { auth?: boolean; signal?: AbortSignal; timeoutMs?: number }
  ) =>
    request<T>(path, {
      method: "GET",
      auth: opts?.auth,
      signal: opts?.signal,
      timeoutMs: opts?.timeoutMs,
    }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; timeoutMs?: number }
  ) =>
    request<T>(path, {
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
      timeoutMs: opts?.timeoutMs,
    }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; timeoutMs?: number }
  ) =>
    request<T>(path, {
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
      timeoutMs: opts?.timeoutMs,
    }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; timeoutMs?: number }
  ) =>
    request<T>(path, {
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
      auth: opts?.auth,
      timeoutMs: opts?.timeoutMs,
    }),
  delete: <T>(path: string, opts?: { auth?: boolean; timeoutMs?: number }) =>
    request<T>(path, {
      method: "DELETE",
      auth: opts?.auth,
      timeoutMs: opts?.timeoutMs,
    }),
};
