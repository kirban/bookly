const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenAccessor = () => string | null;
type TokenSetter = (token: string | null) => void;
type LogoutFn = () => void;

interface ApiClientConfig {
  getToken: TokenAccessor;
  setToken: TokenSetter;
  onUnauthorized: LogoutFn;
}

let clientConfig: ApiClientConfig | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureApiClient(config: ApiClientConfig) {
  clientConfig = config;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as { access_token: string };
    clientConfig?.setToken(body.access_token);
    return body.access_token;
  } catch {
    return null;
  } finally {
    refreshPromise = null;
  }
}

const MAX_401_RETRIES = 2;

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = clientConfig?.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retryCount < MAX_401_RETRIES && clientConfig) {
    // Deduplicate concurrent refresh calls: all 401s share the same refresh
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;

    if (newToken) {
      // Retry with new token (getToken() now returns new token via ref)
      return request<T>(path, options, retryCount + 1);
    }
    clientConfig.onUnauthorized();
    throw new ApiError(401, "Сессия истекла");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string }).message ??
      `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string, init?: RequestInit) {
    return request<T>(path, { ...init, method: "GET" });
  },
  post<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown, init?: RequestInit) {
    return request<T>(path, {
      ...init,
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, init?: RequestInit) {
    return request<T>(path, { ...init, method: "DELETE" });
  },
};
