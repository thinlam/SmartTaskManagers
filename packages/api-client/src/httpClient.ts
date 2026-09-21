/**
 * Framework-agnostic fetch wrapper — deliberately doesn't read
 * `import.meta.env` itself (that's a Vite-ism apps/desktop has, this
 * package doesn't assume any bundler). apps/desktop calls
 * `configureApiClient({ baseUrl: import.meta.env.VITE_API_URL })` once
 * at startup instead (see apps/desktop/src/main.tsx).
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let baseUrl = 'http://localhost:5277';
let authToken: string | null = null;

export function configureApiClient(options: { baseUrl?: string }): void {
  if (options.baseUrl) baseUrl = options.baseUrl;
}

/** Called by AuthContext on login/logout — every other api-client call reads this, none of them take a token argument. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, `Could not reach the server at ${baseUrl}. Is the backend running?`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : undefined) ?? response.statusText;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export const httpClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string): Promise<void> => request<void>(path, { method: 'DELETE' }),
};
