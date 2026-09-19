/**
 * Typography scale (Frame 01, section 6). Font family is Inter everywhere —
 * Canva does not specify a fallback stack, so this uses a standard
 * system-ui fallback chain.
 */
export const fontFamily = {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
} as const;

export const typography = {
  pageTitle: { fontSize: '28px', fontWeight: 700, lineHeight: '34px' },
  sectionTitle: { fontSize: '18px', fontWeight: 600, lineHeight: '24px' },
  cardValue: { fontSize: '32px', fontWeight: 700, lineHeight: '38px' },
  cardLabel: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  body: { fontSize: '14px', fontWeight: 400, lineHeight: '20px' },
  small: { fontSize: '12px', fontWeight: 400, lineHeight: '16px' },
  tableHeader: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: '16px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  badgeText: {
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '14px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
} as const;

export type TypographyToken = keyof typeof typography;
