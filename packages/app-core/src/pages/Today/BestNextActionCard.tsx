import type { TaskSummary } from '@stm/types';
import { useTranslation } from 'react-i18next';
import { TaskCard } from '@stm/ui';

interface BestNextActionCardProps {
  task: TaskSummary | null;
}

/**
 * Frame 04 "Best Next Action" — one highlighted recommendation, or an
 * all-clear state when there is nothing left to do. Mirrors
 * writeBestNextAction_() in apps/google-sheets/src/07_Today.gs.
 */
export function BestNextActionCard({ task }: BestNextActionCardProps) {
  const { t } = useTranslation();

  if (!task) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-soft p-4 text-center text-sm font-semibold text-success">
        {t('today.allClear')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-primary/20 bg-primary-light/40 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
        {t('today.bestNextAction')}
      </span>
      <TaskCard
        title={task.title}
        meta={task.area}
        dueLabel={task.dueLabel}
        priority={task.priority}
        smartScore={task.smartScore}
        recommendedAction={task.recommendedAction}
      />
    </div>
  );
}
