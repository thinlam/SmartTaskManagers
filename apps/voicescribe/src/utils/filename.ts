/**
 * multipart parsers decode the `filename` of an upload as latin1, so a UTF-8 name such as
 * "Ghi tiêu chuẩn.mp3" arrives as "Ghi tiÃªu chuáº©n.mp3". Re-decode it as UTF-8 when the
 * bytes form valid UTF-8; leave it untouched otherwise (already correct, or genuinely latin1).
 */
export function fixFilenameEncoding(name: string): string {
  if (/[^\u0000-ÿ]/.test(name)) return name; // already real Unicode
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}
