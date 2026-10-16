import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface StatusDonutChartDatum {
  key: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
}

export interface StatusDonutChartProps {
  data: StatusDonutChartDatum[];
  centerValue: string;
  centerLabel: string;
}

/**
 * Frame 03's "Task Status Breakdown" / "Priority Breakdown" / "Completion
 * Overview" donuts — a ring with a center value/label plus a legend list
 * (dot, name, count · percent) instead of PriorityDistributionChart's
 * bare ring + tooltip. Kept as its own component rather than folding
 * into PriorityDistributionChart since the two have different call
 * shapes (this one always needs a center label, that one doesn't).
 */
export function StatusDonutChart({ data, centerValue, centerLabel }: StatusDonutChartProps) {
  const nonZero = data.filter((item) => item.count > 0);
  const pieData = nonZero.length > 0 ? nonZero : data;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="label"
              innerRadius={45}
              outerRadius={68}
              paddingAngle={nonZero.length > 1 ? 2 : 0}
              stroke="none"
            >
              {pieData.map((item) => (
                <Cell
                  key={item.key}
                  fill={nonZero.length > 0 ? item.color : 'var(--color-border)'}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-ink-primary">{centerValue}</span>
          <span className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-ink-muted">
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5 text-sm">
        {data.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span className="shrink-0 font-medium text-ink-primary">
              {item.count} · {item.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
