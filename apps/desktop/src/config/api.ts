/**
 * Single source of truth for the backend base URL, read from
 * `VITE_API_BASE_URL` — set per environment in `.env.development`
 * (`http://localhost:5277`) and `.env.production` (the deployed Railway
 * URL), both gitignored (see the repo's `.gitignore` and
 * `.env.example`). Vite loads the matching file automatically: `vite`/
 * `tauri dev` run in `development` mode, `vite build`/`tauri build` run
 * in `production` mode — no extra config needed for that switch.
 *
 * Fails loudly at import time if unset, rather than silently falling
 * back to `localhost` — a production build shipped without this set
 * would otherwise look like it works (no build error) and then fail
 * for every user at runtime with a confusing "could not reach the
 * server" pointed at the wrong host.
 *
 * Every `@stm/api-client` call still goes through `configureApiClient()`
 * (see `packages/api-client/src/httpClient.ts`), not straight through
 * this constant — `lib/serverUrl.ts` uses `API_BASE_URL` as the
 * *default* `configureApiClient()` value, and a user can still override
 * it at runtime on the login screen when connecting to a shared backend
 * on their own LAN (see `apps/desktop/README.md`'s "Cài trên nhiều máy"
 * section). That runtime override is an explicit user action, not a
 * silent fallback, so it doesn't reintroduce the problem this file
 * guards against.
 */
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');

if (!rawApiBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL is not configured. Set it in apps/desktop/.env.development ' +
      '(local backend) or apps/desktop/.env.production (deployed backend) — see ' +
      'apps/desktop/.env.example.',
  );
}

/** Guaranteed non-empty — the check above throws before this line is reached otherwise. */
export const API_BASE_URL: string = rawApiBaseUrl;
