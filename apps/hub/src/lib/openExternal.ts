/**
 * Opens a URL in the system's default browser. In the Tauri desktop
 * build, a plain <a target="_blank"> is silently blocked unless the
 * opener plugin is used; in the plain web build (no Tauri runtime),
 * window.open() is the normal path.
 */
export async function openExternal(url: string): Promise<void> {
  if ('__TAURI_INTERNALS__' in window) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
