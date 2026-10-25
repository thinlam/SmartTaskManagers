const pad = (n: number): string => String(n).padStart(2, '0');

/** 75 -> "01:15", 3725 -> "1:02:05". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 5400 -> "1 giờ 30 phút", 90 -> "2 phút" (rounded up so short clips never read as 0). */
export function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return '0 phút';
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
}

/** Percent of chunks finished; 0 while the server is still preparing the file (total unknown). */
export function progressPercent(done: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}
