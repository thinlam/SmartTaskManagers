import type { Task } from '@stm/types';
import { formatDueLabel } from '@stm/shared';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, IconButton, TaskCard } from '@stm/ui';

interface CalendarAgendaProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

/**
 * Ported from writeCalendarAgenda_()/writeCalendarAgendaRow_() — overdue
 * + upcoming (within the visible grid) open tasks, already sorted by due
 * date then sortCalendarTasks() by the caller (@stm/shared's
 * computeCalendarMonthData). Reuses TaskCard (same row used by Dashboard/
 * Today/Tasks) instead of a 4th bespoke row component — the Sheets
 * version's per-column Area/Status/Priority/Score cells collapse into
 * TaskCard's existing badges.
 */
export function CalendarAgenda({ tasks, onSelectTask }: CalendarAgendaProps) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return <EmptyState message={t('calendar.agendaEmpty')} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TaskCard
              title={task.title}
              meta={task.area}
              dueLabel={formatDueLabel(task.dueDate)}
              priority={task.priority}
              status={task.status}
              smartScore={task.smartScore}
              recommendedAction={task.recommendedAction}
            />
          </div>
          <IconButton
            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('calendar.editAriaLabel', { title: task.title })}
            onClick={() => onSelectTask(task)}
          />
        </div>
      ))}
    </div>
  );
}
