import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { StatCard } from '@stm/ui';
import { computeTodayData, type TodayKpi } from '@stm/shared';
import { useTasksContext } from '../../state/TasksContext';
import { BestNextActionCard } from './BestNextActionCard';
import { TaskListSection } from './TaskListSection';
import { EndOfDayReview } from './EndOfDayReview';

/**
 * `packages/shared`'s computeTodayData() has no i18n access, so its
 * `label`/`sub` on each KPI are English fallbacks only — this builds the
 * real, translated text from `kpi.key` and the raw numeric fields it
 * also carries.
 */
function translateKpi(t: TFunction, kpi: TodayKpi): { label: string; sub: string } {
  switch (kpi.key) {
    case 'dueToday':
      return {
        label: t('today.kpiDueToday'),
        sub: t('common.highPriorityCount', { count: kpi.highPriorityCount ?? 0 }),
      };
    case 'overdue':
      return {
        label: t('today.kpiOverdue'),
        sub: (kpi.overdueCount ?? 0) > 0 ? t('common.needsAttention') : t('common.allClearShort'),
      };
    case 'focusLoad':
      return {
        label: t('today.kpiFocusLoad'),
        sub: t('common.ofHourCapacity', {
          percent: kpi.focusLoadPercent ?? 0,
          hours: kpi.focusCapacityHours ?? 0,
        }),
      };
    case 'completed':
      return {
        label: t('today.kpiCompleted'),
        sub: t('common.completionRate', { rate: kpi.completionRate ?? 0 }),
      };
    case 'quickWins':
      return {
        label: t('today.kpiQuickWins'),
        sub: t('common.minutesOrLess'),
      };
  }
}

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
  const { t, i18n } = useTranslation();
  const { tasks, isLoading } = useTasksContext();
  const data = useMemo(() => computeTodayData(tasks, new Date(), t), [tasks, t]);

  const dateLabel = new Date().toLocaleDateString(i18n.language, {
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
          {dateLabel} · {t('today.subtitle')}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.kpis.map((kpi) => {
          const { label, sub } = translateKpi(t, kpi);
          return (
            <StatCard key={kpi.key} label={label} value={kpi.value} sub={sub} tone={kpi.tone} />
          );
        })}
      </section>

      <BestNextActionCard task={data.bestNext} />

      <TaskListSection
        title={t('today.doNow')}
        subtitle={t('today.doNowSubtitle')}
        tasks={data.doNow.tasks}
        emptyText={t('today.doNowEmpty')}
        accent="danger"
      />
      <TaskListSection
        title={t('today.scheduled')}
        subtitle={t('today.scheduledSubtitle')}
        tasks={data.scheduled.tasks}
        emptyText={t('today.scheduledEmpty')}
        accent="info"
      />
      <TaskListSection
        title={t('today.quickWins')}
        subtitle={t('today.quickWinsSubtitle')}
        tasks={data.quickWins.tasks}
        emptyText={t('today.quickWinsEmpty')}
        accent="success"
      />

      <EndOfDayReview review={data.review} />
    </div>
  );
}
