import { StatCard } from '@stm/ui';
import { MOCK_TODAY_DATA } from '../../mock/today';
import { BestNextActionCard } from './BestNextActionCard';
import { TaskListSection } from './TaskListSection';
import { EndOfDayReview } from './EndOfDayReview';

/**
 * Frame 04 (Today), adapted to Personal Mode — mirrors
 * apps/google-sheets/src/07_Today.gs's computeTodayData_(): same 5 KPIs
 * (Due Today, Overdue, Focus Load, Completed, Quick Wins), Best Next
 * Action, Do Now / Scheduled / Quick Wins, End-of-Day Review. Uses
 * MOCK_TODAY_DATA until Phase 27 wires up the real API.
 */
export function TodayPage() {
  const data = MOCK_TODAY_DATA;
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">Today</h1>
        <p className="text-sm text-ink-secondary">
          {dateLabel} · {data.subtitle}
        </p>
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

      <BestNextActionCard task={data.bestNext} />

      <TaskListSection
        title="Do Now"
        subtitle={data.doNow.subtitle}
        tasks={data.doNow.tasks}
        emptyText={data.doNow.emptyText}
        accent="danger"
      />
      <TaskListSection
        title="Scheduled"
        subtitle={data.scheduled.subtitle}
        tasks={data.scheduled.tasks}
        emptyText={data.scheduled.emptyText}
        accent="info"
      />
      <TaskListSection
        title="Quick Wins"
        subtitle={data.quickWins.subtitle}
        tasks={data.quickWins.tasks}
        emptyText={data.quickWins.emptyText}
        accent="success"
      />

      <EndOfDayReview review={data.review} />
    </div>
  );
}
