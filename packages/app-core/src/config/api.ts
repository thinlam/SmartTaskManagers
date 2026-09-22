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
 * section — that LAN-override feature is desktop-specific, `apps/web` has no
 * equivalent UI for it). That runtime override is an explicit user action, not a
 * silent fallback, so it doesn't reintroduce the problem this file
 * guards against.
 */
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');

if (!rawApiBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is not configured. Set it in your app's .env.development " +
      '(local backend) or .env.production (deployed backend) — see the .env.example ' +
      "in apps/desktop/ or apps/web/, whichever app you're running.",
  );
}

// Caught for real once: VITE_API_BASE_URL set to
// "smarttaskmanagers-production.up.railway.app" with no "https://" — a
// scheme-less value doesn't fail loudly like a missing one does, it
// silently becomes a *relative* URL to `fetch()` (resolved against the
// app's own origin), so every request quietly goes nowhere real instead
// of throwing. Worth guarding explicitly since it already happened once.
if (!/^https?:\/\//i.test(rawApiBaseUrl)) {
  throw new Error(
    `VITE_API_BASE_URL ("${rawApiBaseUrl}") is missing its scheme — it must start with ` +
      '"http://" or "https://", otherwise fetch() treats it as a relative path instead of ' +
      'an absolute URL to the backend.',
  );
}

/** Guaranteed non-empty — the check above throws before this line is reached otherwise. */
export const API_BASE_URL: string = rawApiBaseUrl;
