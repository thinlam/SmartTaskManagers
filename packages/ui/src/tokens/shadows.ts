/**
 * Elevation scale — NOT explicitly specified in the Canva frames read so
 * far (Frame 01 only defines colors/typography/spacing; Frame 02's cards
 * show a light border with no heavy drop shadow). This is a conservative
 * default consistent with that flat, subtle surface style. Revisit and
 * replace with exact values if a Canva export/screenshot ever specifies
 * one — do not treat this file as extracted, only the others are.
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
  md: '0 2px 8px 0 rgb(15 23 42 / 0.06)',
  lg: '0 8px 24px -4px rgb(15 23 42 / 0.10)',
} as const;

export type ShadowToken = keyof typeof shadows;
