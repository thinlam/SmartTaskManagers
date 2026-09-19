/** Border radius scale (Frame 01/02/18) — kept uniform across the whole app. */
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  pill: '9999px',
} as const;

export type RadiusToken = keyof typeof radius;
