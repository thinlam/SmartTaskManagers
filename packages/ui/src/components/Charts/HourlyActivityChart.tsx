import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface HourlyActivityChartDatum {
  /** e.g. "8 AM" — already formatted by the caller (i18n-aware). */
  label: string;
  completedCount: number;
  scheduledCount: number;
}

export interface HourlyActivityChartProps {
  data: HourlyActivityChartDatum[];
  completedLabel?: string;
  scheduledLabel?: string;
}

/**
 * Frame 04's "Completed by Hour" chart — two series (completed today, in
 * a solid color; still-scheduled today, lighter) grouped by hour of day.
 * Both series come from real data: completedCount from each task's
 * actual CompletedDate hour, scheduledCount from open tasks' dueTime
 * hour — nothing here is simulated.
 */
export function HourlyActivityChart({
  data,
  completedLabel = 'Completed',
  scheduledLabel = 'Scheduled',
}: HourlyActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-surface-secondary)' }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        />
        <Bar
          dataKey="completedCount"
          name={completedLabel}
          fill="var(--color-primary)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="scheduledCount"
          name={scheduledLabel}
          fill="var(--color-primary-light)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
