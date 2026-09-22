import { useTranslation } from 'react-i18next';
import type { Priority, TaskStatus } from '@stm/types';

export type StatusFilter = TaskStatus | 'All';
export type PriorityFilter = Priority | 'All';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
}

const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}: TaskFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t('tasks.searchPlaceholder')}
        aria-label={t('tasks.searchAriaLabel')}
        className={`${controlClasses} min-w-[220px] flex-1`}
      />
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
        aria-label={t('tasks.statusFilterAriaLabel')}
        className={controlClasses}
      >
        <option value="All">{t('tasks.allStatuses')}</option>
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
        aria-label={t('tasks.priorityFilterAriaLabel')}
        className={controlClasses}
      >
        <option value="All">{t('tasks.allPriorities')}</option>
        {PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}
