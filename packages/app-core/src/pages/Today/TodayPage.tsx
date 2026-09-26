import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@stm/ui';
import { computeTodayData } from '@stm/shared';
import { useTasksContext } from '../../state/TasksContext';
import { BestNextActionCard } from './BestNextActionCard';
import { TaskListSection } from './TaskListSection';
import { EndOfDayReview } from './EndOfDayReview';

/**
 * Frame 04 (Today), adapted to Personal Mode — mirrors
 * apps/google-sheets/src/07_Today.gs's computeTodayData_(): same 5 KPIs
 * (Due Today, Overdue, Focus Load, Completed, Quick Wins), Best Next
 * Action, Do Now / Scheduled / Quick Wins, End-of-Day Review. Real data
 * since Phase 30 — computeTodayData() (packages/shared) reads tasks
 * straight from TasksContext (backend-backed since Phase 27); smartScore/
 * recommendedAction are the real Smart Engine output (Phase 29).
 */
export function TodayPage() {
  const { t } = useTranslation();
  const { tasks, isLoading } = useTasksContext();
  const data = useMemo(() => computeTodayData(tasks), [tasks]);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('today.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('today.title')}
        </h1>
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
        title={t('today.doNow')}
        subtitle={data.doNow.subtitle}
        tasks={data.doNow.tasks}
        emptyText={data.doNow.emptyText}
        accent="danger"
      />
      <TaskListSection
        title={t('today.scheduled')}
        subtitle={data.scheduled.subtitle}
        tasks={data.scheduled.tasks}
        emptyText={data.scheduled.emptyText}
        accent="info"
      />
      <TaskListSection
        title={t('today.quickWins')}
        subtitle={data.quickWins.subtitle}
        tasks={data.quickWins.tasks}
        emptyText={data.quickWins.emptyText}
        accent="success"
      />

      <EndOfDayReview review={data.review} />
    </div>
  );
}
