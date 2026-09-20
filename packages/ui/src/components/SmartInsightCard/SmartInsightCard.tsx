import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SmartInsightCardProps {
  tone: 'danger' | 'warning' | 'success' | 'info';
  children: ReactNode;
}

const TONE_CLASSES: Record<SmartInsightCardProps['tone'], string> = {
  danger: 'border-danger/30 bg-danger-soft text-danger',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  success: 'border-success/30 bg-success-soft text-success',
  info: 'border-info/30 bg-info-soft text-info',
};

/**
 * Frame 03 "✨ Smart Insight" pattern. Purely presentational — the insight
 * text itself must come from real computed data (never fabricated here);
 * Dashboard's mock fixture documents which numbers are real vs placeholder.
 */
export function SmartInsightCard({ tone, children }: SmartInsightCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        TONE_CLASSES[tone],
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
