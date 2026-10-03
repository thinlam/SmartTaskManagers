import { useTranslation } from 'react-i18next';
import type { Priority, Project, Risk, TaskStatus } from '@stm/types';

export type StatusFilter = TaskStatus | 'All';
export type PriorityFilter = Priority | 'All';
export type RiskFilter = Risk | 'All';
export type SortOption = 'smartScore' | 'dueDate' | 'priority' | 'progress';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  risk: RiskFilter;
  onRiskChange: (value: RiskFilter) => void;
  projectId: string;
  onProjectChange: (value: string) => void;
  projects: Project[];
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];
const RISKS: Risk[] = ['Critical', 'High', 'Medium', 'Low'];

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  risk,
  onRiskChange,
  projectId,
  onProjectChange,
  projects,
  sort,
  onSortChange,
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
        value={projectId}
        onChange={(event) => onProjectChange(event.target.value)}
        aria-label={t('tasks.projectFilterAriaLabel')}
        className={controlClasses}
      >
        <option value="All">{t('tasks.allProjects')}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
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
      <select
        value={risk}
        onChange={(event) => onRiskChange(event.target.value as RiskFilter)}
        aria-label={t('tasks.riskFilterAriaLabel')}
        className={controlClasses}
      >
        <option value="All">{t('tasks.allRisks')}</option>
        {RISKS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(event) => onSortChange(event.target.value as SortOption)}
        aria-label={t('tasks.sortAriaLabel')}
        className={controlClasses}
      >
        <option value="smartScore">{t('tasks.sortSmartScore')}</option>
        <option value="dueDate">{t('tasks.sortDueDate')}</option>
        <option value="priority">{t('tasks.sortPriority')}</option>
        <option value="progress">{t('tasks.sortProgress')}</option>
      </select>
    </div>
  );
}
