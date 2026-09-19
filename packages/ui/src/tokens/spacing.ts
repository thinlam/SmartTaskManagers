/**
 * Spacing scale (Frame 01, section 7): 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 px.
 *
 * Note: this happens to be exactly Tailwind's own default spacing scale at
 * steps 1/2/3/4/5/6/8/10 (1 step = 4px). Phase 05's Tailwind setup will not
 * need to override `theme.spacing` at all — only colors/radius/typography
 * are Canva-specific enough to need overriding.
 */
export const spacing = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  20: '20px',
  24: '24px',
  32: '32px',
  40: '40px',
} as const;

export type SpacingToken = keyof typeof spacing;
