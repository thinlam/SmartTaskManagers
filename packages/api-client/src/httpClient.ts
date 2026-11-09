/**
 * Framework-agnostic fetch wrapper — deliberately doesn't read
 * `import.meta.env` itself (that's a Vite-ism apps/desktop has, this
 * package doesn't assume any bundler). apps/desktop calls
 * `configureApiClient({ baseUrl: API_BASE_URL })` once at startup instead
 * (see packages/app-core/src/config/api.ts and apps/desktop/src/main.tsx).
 *
 * No hard-coded default here on purpose — a missing/wrong base URL
 * should fail clearly (see the error below) instead of silently
 * targeting `localhost` in a build that was never configured for it.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Per-field messages from an ASP.NET ValidationProblem (422) body — undefined for any other error shape. */
    public readonly errors?: Record<string, string[]>,
    /** 409 "needs confirmation" payload from TasksController (complete/delete with incomplete subtasks) — "complete" or "delete". Undefined for any other error shape. */
    public readonly confirmAction?: string,
    public readonly subtaskIds?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let baseUrl: string | null = null;
let authToken: string | null = null;
let onSessionRevoked: (() => void) | null = null;

export function configureApiClient(options: { baseUrl?: string }): void {
  if (options.baseUrl) baseUrl = options.baseUrl;
}

/** Called by AuthContext to be notified when the backend reports this session was revoked (password changed elsewhere, explicitly revoked, or a pre-this-feature token with no matching session) — lets the app clear local auth state and fall back to the login screen instead of leaving the user stuck with every request failing. */
export function setOnSessionRevoked(callback: (() => void) | null): void {
  onSessionRevoked = callback;
}

/** Called by AuthContext on login/logout — every other api-client call reads this, none of them take a token argument. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(
      0,
      'API base URL is not configured. Call configureApiClient({ baseUrl }) before making requests.',
    );
  }

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

  if (
    response.status === 401 &&
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    (data as { code: unknown }).code === 'session_revoked'
  ) {
    onSessionRevoked?.();
  }

  if (!response.ok) {
    const errors =
      typeof data === 'object' && data !== null && 'errors' in data
        ? (data as { errors: Record<string, string[]> }).errors
        : undefined;
    const confirmAction =
      response.status === 409 && typeof data === 'object' && data !== null && 'action' in data
        ? String((data as { action: unknown }).action)
        : undefined;
    const subtaskIds =
      confirmAction && typeof data === 'object' && data !== null && 'subtaskIds' in data
        ? (data as { subtaskIds: string[] }).subtaskIds
        : undefined;
    const message =
      (typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : undefined) ??
      (errors ? Object.values(errors).flat().join(' ') : undefined) ??
      response.statusText;
    throw new ApiError(response.status, message, errors, confirmAction, subtaskIds);
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
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string): Promise<void> => request<void>(path, { method: 'DELETE' }),
};
