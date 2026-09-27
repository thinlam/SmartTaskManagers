import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Priority } from '@stm/types';

export interface PriorityDistributionChartDatum {
  priority: Priority;
  label: string;
  count: number;
}

export interface PriorityDistributionChartProps {
  data: PriorityDistributionChartDatum[];
}

const PRIORITY_COLOR: Record<Priority, string> = {
  Critical: 'var(--color-priority-critical)',
  Urgent: 'var(--color-priority-urgent)',
  High: 'var(--color-priority-high)',
  Medium: 'var(--color-priority-medium)',
  Low: 'var(--color-priority-low)',
};

/** Donut chart of open+completed tasks by priority — reads getPriorityDistribution() output directly. */
export function PriorityDistributionChart({ data }: PriorityDistributionChartProps) {
  const nonZero = data.filter((item) => item.count > 0);

  if (nonZero.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <Pie
          data={nonZero}
          dataKey="count"
          nameKey="label"
          innerRadius={45}
          outerRadius={72}
          paddingAngle={2}
        >
          {nonZero.map((item) => (
            <Cell key={item.priority} fill={PRIORITY_COLOR[item.priority]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
