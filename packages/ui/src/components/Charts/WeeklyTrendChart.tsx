import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface WeeklyTrendChartDatum {
  label: string;
  completedCount: number;
}

export interface WeeklyTrendChartProps {
  data: WeeklyTrendChartDatum[];
  /** Tooltip/axis label for the count series, e.g. "Completed". */
  countLabel?: string;
}

/**
 * Small bar chart of the last 7 days' completed-task counts — reads
 * `packages/shared`'s getWeeklyCompletionTrend() output directly, no
 * extra transform needed.
 */
export function WeeklyTrendChart({ data, countLabel = 'Completed' }: WeeklyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
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
          formatter={(value) => [value, countLabel]}
        />
        <Bar dataKey="completedCount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
