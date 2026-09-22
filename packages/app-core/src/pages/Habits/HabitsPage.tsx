import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, StatCard } from '@stm/ui';
import { useHabitsContext } from '../../state/HabitsContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { HabitRow } from './HabitRow';

/**
 * No Frame/Sheets view precedent for a dedicated Habits screen (same
 * situation as Goals, Phase 14) — the underlying data model is real
 * (HABIT_HEADERS, createHabit_/getAllHabits_ in apps/google-sheets/src/
 * 00_Constants.gs + 03_Data.gs) but there's no computed-metrics view to
 * port. "Best Streak" mirrors getBestHabitStreak_() in
 * apps/google-sheets/src/06_Dashboard.gs (max of Streak across habits) —
 * the one real precedent that exists, even though it's Dashboard's KPI,
 * not a Habits-page one; Dashboard itself isn't wired to real habits yet
 * (still Phase 09's static mock), left for a future phase.
 */
export function HabitsPage() {
  const { t } = useTranslation();
  const { habits, isLoading, addHabit, deleteHabit, openEditDrawer } = useHabitsContext();

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (habits.length === 0) {
      return { total: 0, checkedInToday: 0, bestStreak: 0, totalCheckIns: 0 };
    }

    let checkedInToday = 0;
    let bestStreak = 0;
    let totalCheckIns = 0;

    for (const habit of habits) {
      if (habit.lastCompletedDate === today) checkedInToday += 1;
      bestStreak = Math.max(bestStreak, habit.streak);
      totalCheckIns += habit.completedCount;
    }

    return { total: habits.length, checkedInToday, bestStreak, totalCheckIns };
  }, [habits]);

  function handleAdd(name: string) {
    addHabit({ name }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('habits.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('habits.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('habits.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('habits.statTotal')}
          value={String(summary.total)}
          sub={t('habits.statTotalSub')}
          tone="primary"
        />
        <StatCard
          label={t('habits.statCheckedIn')}
          value={String(summary.checkedInToday)}
          sub={t('habits.statCheckedInSub', { total: summary.total })}
          tone="success"
        />
        <StatCard
          label={t('habits.statBestStreak')}
          value={String(summary.bestStreak)}
          sub={t('habits.statBestStreakSub')}
          tone="warning"
        />
        <StatCard
          label={t('habits.statTotalCheckIns')}
          value={String(summary.totalCheckIns)}
          sub={t('habits.statTotalCheckInsSub')}
          tone="info"
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder={t('habits.quickCapturePlaceholder')} />

      {habits.length === 0 ? (
        <EmptyState message={t('habits.emptyNoHabits')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onEdit={openEditDrawer}
              onDelete={(id) => deleteHabit(id).catch(reportError)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
