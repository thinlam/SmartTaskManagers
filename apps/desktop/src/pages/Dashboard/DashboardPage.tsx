import { Progress, SmartInsightCard, StatCard, TaskCard } from '@stm/ui';
import { MOCK_DASHBOARD_DATA } from '../../mock/dashboard';

/**
 * Frame 03 (Dashboard), adapted to Personal Mode: KPI row, Focus Now,
 * My Areas (replaces the team version's per-project "Project Health" +
 * "Team Capacity" — Personal Mode has no team, so this groups by Area,
 * matching apps/google-sheets/src/06_Dashboard.gs's getAreaProgress_()),
 * and Smart Insights. Uses MOCK_DASHBOARD_DATA until Phase 27 wires up
 * the real API.
 */
export function DashboardPage() {
  const data = MOCK_DASHBOARD_DATA;

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Dashboard</h1>
        <p className="text-sm text-ink-secondary">{data.greeting}</p>
        <p className="text-xs text-ink-muted">{data.summary}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">Focus Now</h2>
        <div className="flex flex-col gap-2">
          {data.focusNow.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              meta={task.area}
              dueLabel={task.dueLabel}
              priority={task.priority}
              smartScore={task.smartScore}
              recommendedAction={task.recommendedAction}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">My Areas</h2>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            {data.areas.map((area) => (
              <div key={area.area} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-primary">{area.area}</span>
                  <span className="text-ink-secondary">{area.progress}%</span>
                </div>
                <Progress value={area.progress} />
                <span className="text-xs text-ink-muted">
                  {area.completed} completed · {area.open} open · {area.total} total
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">Smart Insights</h2>
          <div className="flex flex-col gap-2">
            {data.insights.map((insight) => (
              <SmartInsightCard key={insight.text} tone={insight.tone}>
                {insight.text}
              </SmartInsightCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
