import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, HelpButton } from '@stm/ui';
import { useGoalsContext } from '../../state/GoalsContext';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { GoalRow } from './GoalRow';

/**
 * No Frame/Sheets view precedent for a dedicated Goals screen (same
 * situation as Inbox, Phase 11) — the underlying data model is real
 * (GOAL_HEADERS, createGoal_/getAllGoals_ in apps/google-sheets/src/
 * 00_Constants.gs + 03_Data.gs) but there's no computed-metrics view to
 * port like Projects had (14_Projects.gs). KPI row is a straightforward
 * rollup of the stored Status/Progress fields — no fabricated scoring.
 */
export function GoalsPage() {
  const { t } = useTranslation();
  const { goals, isLoading, addGoal, deleteGoal, openEditDrawer } = useGoalsContext();
  const { tasks } = useTasksContext();

  const summary = useMemo(() => {
    if (goals.length === 0) {
      return { total: 0, onTrack: 0, atRisk: 0, avgProgress: 0 };
    }

    let onTrack = 0;
    let atRisk = 0;
    let progressSum = 0;

    for (const goal of goals) {
      if (goal.status === 'On Track') onTrack += 1;
      if (goal.status === 'At Risk') atRisk += 1;
      progressSum += goal.progress;
    }

    return {
      total: goals.length,
      onTrack,
      atRisk,
      avgProgress: Math.round(progressSum / goals.length),
    };
  }, [goals]);

  function handleAdd(name: string) {
    addGoal({ name, area: 'Personal' }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('goals.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('goals.title')}
          </h1>
          <HelpButton
            title={t('help.goals.title')}
            intro={t('help.goals.intro')}
            items={t('help.goals.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{t('goals.subtitle')}</p>
      </header>

      {summary.total > 0 && (
        <p className="text-sm text-ink-secondary">
          {t('goals.summaryLine', {
            total: summary.total,
            onTrack: summary.onTrack,
            atRisk: summary.atRisk,
            avg: summary.avgProgress,
          })}
        </p>
      )}

      <QuickCaptureInput onAdd={handleAdd} placeholder={t('goals.quickCapturePlaceholder')} />

      {goals.length === 0 ? (
        <EmptyState message={t('goals.emptyNoGoals')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              allTasks={tasks}
              onEdit={openEditDrawer}
              onDelete={(id) => deleteGoal(id).catch(reportError)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
