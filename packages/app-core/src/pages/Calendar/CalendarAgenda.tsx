import type { Task } from '@stm/types';
import { formatDueLabel } from '@stm/shared';
import { useTranslation } from 'react-i18next';
import { EmptyState, TaskCard } from '@stm/ui';
import { translatePriority, translateTaskStatus } from '../../lib/enumLabels';

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
 * TaskCard's existing badges. Clicking a row opens the real Task Detail
 * page (same as Tasks/Kanban) instead of the edit drawer — editing is
 * one click away from there via its own "Edit Task" button.
 */
export function CalendarAgenda({ tasks, onSelectTask }: CalendarAgendaProps) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return <EmptyState message={t('calendar.agendaEmpty')} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onSelectTask(task)}
          className="text-left"
        >
          <TaskCard
            title={task.title}
            meta={task.area}
            dueLabel={formatDueLabel(task.dueDate, new Date(), t)}
            priority={task.priority}
            priorityLabel={translatePriority(t, task.priority)}
            status={task.status}
            statusLabel={translateTaskStatus(t, task.status)}
            smartScore={task.smartScore}
            recommendedAction={task.recommendedAction}
          />
        </button>
      ))}
    </div>
  );
}
