import type { Risk } from '@stm/types';
import { Badge } from './Badge';

/**
 * design-tokens.md named this component ("Badge → StatusBadge/
 * PriorityBadge/RiskBadge") since Frame 02, but no screen needed it
 * until Smart Assistant (post-Phase-30) — first real code for it.
 * Reuses the risk-* color tokens, same as ProjectHealthBadge (Frame 01
 * §5: Risk and Project Health share one 4-level severity scale).
 */
const RISK_CLASSES: Record<Risk, string> = {
  Low: 'bg-risk-low/10 text-risk-low',
  Medium: 'bg-risk-medium/10 text-risk-medium',
  High: 'bg-risk-high/10 text-risk-high',
  Critical: 'bg-risk-critical/10 text-risk-critical',
};

export interface RiskBadgeProps {
  risk: Risk;
  /** Translated display text — falls back to the raw enum value when omitted (this package has no i18n access). */
  label?: string;
}

export function RiskBadge({ risk, label }: RiskBadgeProps) {
  return <Badge className={RISK_CLASSES[risk]}>{label ?? risk}</Badge>;
}
