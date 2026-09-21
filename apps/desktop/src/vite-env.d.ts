/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL — see src/config/api.ts's doc comment. */
  readonly VITE_API_BASE_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
