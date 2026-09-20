import type { WeeklyTrendDay } from '@stm/shared';

interface WeeklyTrendChartProps {
  days: WeeklyTrendDay[];
}

/**
 * Plain CSS bar chart, no charting library — matches the spec's
 * "professional, minimal, không biến thành dashboard quá nhiều chart"
 * (MODULE_PROMPTS.md §10). Bar height is relative to the week's own max,
 * not a fixed scale, so a quiet week doesn't render as all-empty bars.
 */
export function WeeklyTrendChart({ days }: WeeklyTrendChartProps) {
  const max = Math.max(1, ...days.map((day) => day.completedCount));

  return (
    <div className="flex items-end justify-between gap-2 rounded-lg border border-border bg-surface p-4">
      {days.map((day) => (
        <div key={day.dateKey} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-primary">{day.completedCount}</span>
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-t-sm bg-primary transition-[height]"
              style={{
                height: day.completedCount > 0 ? `${(day.completedCount / max) * 100}%` : '2px',
              }}
            />
          </div>
          <span className="text-xs text-ink-muted">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
