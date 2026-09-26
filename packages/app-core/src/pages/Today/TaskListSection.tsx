import type { TaskSummary } from '@stm/types';
import { useTranslation } from 'react-i18next';
import { EmptyState, TaskCard } from '@stm/ui';
import { translatePriority } from '../../lib/enumLabels';

interface TaskListSectionProps {
  title: string;
  subtitle: string;
  tasks: TaskSummary[];
  emptyText: string;
  accent: 'danger' | 'info' | 'success';
}

const ACCENT_DOT: Record<TaskListSectionProps['accent'], string> = {
  danger: 'bg-danger',
  info: 'bg-info',
  success: 'bg-success',
};

/**
 * Do Now / Scheduled / Quick Wins — same section shape, different data
 * and tone accent. Mirrors writeTodaySection_() in
 * apps/google-sheets/src/07_Today.gs.
 */
export function TaskListSection({
  title,
  subtitle,
  tasks,
  emptyText,
  accent,
}: TaskListSectionProps) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[accent]}`} aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
        </div>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState message={emptyText} />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              meta={task.area}
              dueLabel={task.dueLabel}
              priority={task.priority}
              priorityLabel={translatePriority(t, task.priority)}
              smartScore={task.smartScore}
              recommendedAction={task.recommendedAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
