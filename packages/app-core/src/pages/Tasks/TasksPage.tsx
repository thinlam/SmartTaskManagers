import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw } from 'lucide-react';
import type { Priority, Task } from '@stm/types';
import { formatDueLabel, formatDateVi } from '@stm/shared';
import {
  Button,
  EmptyState,
  HelpButton,
  PriorityBadge,
  Progress,
  RiskBadge,
  StatusBadge,
} from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useTagsContext } from '../../state/TagsContext';
import { reportError } from '../../lib/reportError';
import { translatePriority, translateTaskStatus, translateRisk } from '../../lib/enumLabels';
import {
  TaskFilters,
  type PriorityFilter,
  type RiskFilter,
  type SortOption,
  type StatusFilter,
} from './TaskFilters';
import { TaskActions } from './TaskActions';

type ViewTab = 'all' | 'active' | 'completed' | 'overdue';

const PAGE_SIZE = 10;
const PRIORITY_WEIGHT: Record<Priority, number> = {
  Critical: 5,
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOverdue(task: Task, today: Date): boolean {
  if (task.status === 'Completed' || !task.dueDate) return false;
  return startOfDay(new Date(task.dueDate)).getTime() < today.getTime();
}

function formatTimelineRange(startDate: string | null, dueDate: string | null): string | null {
  if (!startDate && !dueDate) return null;
  const fmt = (iso: string) => formatDateVi(new Date(iso));
  if (startDate && dueDate) return `${fmt(startDate)} → ${fmt(dueDate)}`;
  return fmt(startDate ?? dueDate!);
}

function dueLabelTone(task: Task, today: Date): 'danger' | 'warning' | 'success' | 'muted' {
  if (task.status === 'Completed') return 'success';
  if (!task.dueDate) return 'muted';
  const diffDays = Math.round(
    (startOfDay(new Date(task.dueDate)).getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays < 0) return 'danger';
  if (diffDays <= 1) return 'warning';
  return 'muted';
}

const DUE_LABEL_TONE_CLASSES: Record<ReturnType<typeof dueLabelTone>, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
  muted: 'text-ink-muted',
};

/**
 * Frame 05 (Tasks), redesigned per the user-supplied mockup: a real data
 * table (Task/Project/Status/Priority/Progress/Timeline/Risk/Score)
 * instead of the previous TaskCard list, quick-filter tabs, a fuller
 * filter bar (Project/Status/Priority/Risk/Sort), pagination, and a real
 * CSV export + refresh — all backed by data this app actually has.
 *
 * Adapted for single-user scope: no Owner column/filter (every task
 * already belongs to the signed-in user), so no separate "My Tasks" tab
 * either (it would be identical to "All Tasks"). "More filters" in the
 * mockup became a real Risk filter instead of a non-functional button.
 */
export function TasksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tasks, isLoading, lastFetchedAt, refetch, deleteTask, completeTask, openEditDrawer } =
    useTasksContext();
  const { projects } = useProjectsContext();
  const { tags } = useTagsContext();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [priority, setPriority] = useState<PriorityFilter>('All');
  const [risk, setRisk] = useState<RiskFilter>('All');
  const [tag, setTag] = useState<string>('All');
  // "View project →" on Projects (Frame 11) links here as /tasks?project=<id> —
  // this is the only way to arrive with a non-default filter already applied.
  const [projectId, setProjectId] = useState<string>(() => searchParams.get('project') ?? 'All');
  const [sort, setSort] = useState<SortOption>('smartScore');
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let overdue = 0;
    let highCritical = 0;

    for (const task of tasks) {
      if (task.status === 'Completed') completed += 1;
      else if (task.status !== 'Inbox') active += 1;

      if (isOverdue(task, today)) overdue += 1;
      if (task.priority === 'Critical' || task.priority === 'High') highCritical += 1;
    }

    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { active, completed, overdue, highCritical, completionRate };
  }, [tasks, today]);

  const tabFilteredTasks = useMemo(() => {
    switch (viewTab) {
      case 'active':
        return tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Inbox');
      case 'completed':
        return tasks.filter((task) => task.status === 'Completed');
      case 'overdue':
        return tasks.filter((task) => isOverdue(task, today));
      default:
        return tasks;
    }
  }, [tasks, viewTab, today]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tabFilteredTasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return false;
      if (status !== 'All' && task.status !== status) return false;
      if (priority !== 'All' && task.priority !== priority) return false;
      if (risk !== 'All' && task.risk !== risk) return false;
      if (projectId !== 'All' && task.projectId !== projectId) return false;
      if (tag !== 'All' && !task.tags.includes(tag)) return false;
      return true;
    });
  }, [tabFilteredTasks, search, status, priority, risk, projectId, tag]);

  const sortedTasks = useMemo(() => {
    const sorted = filteredTasks.slice();
    switch (sort) {
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'priority':
        sorted.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
        break;
      case 'progress':
        sorted.sort((a, b) => b.progress - a.progress);
        break;
      default:
        sorted.sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0));
    }
    return sorted;
  }, [filteredTasks, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, status, priority, risk, projectId, tag, sort, viewTab]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTasks = sortedTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleExport() {
    const header = [
      'Title',
      'Project',
      'Status',
      'Priority',
      'Progress',
      'Start',
      'Due',
      'Risk',
      'SmartScore',
    ];
    const rows = sortedTasks.map((task) => [
      task.title,
      task.projectId ? (projectNameById.get(task.projectId) ?? '') : '',
      task.status,
      task.priority,
      String(task.progress),
      task.startDate ?? '',
      task.dueDate ?? '',
      task.risk ?? '',
      task.smartScore != null ? String(task.smartScore) : '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const lastUpdatedLabel = lastFetchedAt
    ? lastFetchedAt.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })
    : null;

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('tasks.loading')}</div>;
  }

  const TABS: { key: ViewTab; label: string; count: number }[] = [
    { key: 'all', label: t('tasks.tabAll'), count: tasks.length },
    { key: 'active', label: t('tasks.tabActive'), count: counts.active },
    { key: 'completed', label: t('tasks.tabCompleted'), count: counts.completed },
    { key: 'overdue', label: t('tasks.tabOverdue'), count: counts.overdue },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
              {t('tasks.title')}
            </h1>
            <HelpButton
              title={t('help.tasks.title')}
              intro={t('help.tasks.intro')}
              items={t('help.tasks.items', { returnObjects: true }) as string[]}
              closeLabel={t('common.close')}
            />
          </div>
          <p className="text-sm text-ink-secondary">{t('tasks.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/tags')}>
            {t('tasks.manageTagsButton')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            {t('tasks.exportButton')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            leadingIcon={
              <RefreshCw
                className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                aria-hidden="true"
              />
            }
          >
            {t('tasks.refreshButton')}
          </Button>
        </div>
      </header>

      {tasks.length > 0 && (
        <p className="text-sm text-ink-secondary">
          {t('tasks.summaryLine', {
            active: counts.active,
            overdue: counts.overdue,
            high: counts.highCritical,
            rate: counts.completionRate,
          })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border">
        <div className="flex flex-wrap gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewTab(tab.key)}
              className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                viewTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {tab.label} <span className="text-xs text-ink-muted">{tab.count}</span>
            </button>
          ))}
        </div>
        {lastUpdatedLabel && (
          <span className="pb-2 text-xs text-ink-muted">
            {t('tasks.updatedLabel', { time: lastUpdatedLabel })}
          </span>
        )}
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        risk={risk}
        onRiskChange={setRisk}
        projectId={projectId}
        onProjectChange={setProjectId}
        projects={projects}
        tag={tag}
        onTagChange={setTag}
        tagNames={tags.map((t) => t.name)}
        sort={sort}
        onSortChange={setSort}
      />

      {pageTasks.length === 0 ? (
        <EmptyState
          message={tasks.length === 0 ? t('tasks.emptyNoTasks') : t('tasks.emptyNoMatch')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-medium">{t('tasks.colTask')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colProject')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colStatus')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colPriority')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colProgress')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colTimeline')}</th>
                <th className="hidden px-4 py-2 font-medium xl:table-cell">{t('tasks.colRisk')}</th>
                <th className="hidden px-4 py-2 font-medium xl:table-cell">
                  {t('tasks.colScore')}
                </th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageTasks.map((task) => {
                const timeline = formatTimelineRange(task.startDate, task.dueDate);
                const tone = dueLabelTone(task, today);
                return (
                  <tr key={task.id} className="group hover:bg-surface-secondary">
                    <td className="max-w-[220px] px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="flex flex-col text-left"
                      >
                        <span className="truncate font-medium text-ink-primary hover:underline">
                          {task.title}
                        </span>
                        <span className="text-xs text-ink-muted">{task.area}</span>
                      </button>
                      {task.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {task.tags.map((tagName) => (
                            <button
                              key={tagName}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setTag(tagName);
                              }}
                              className="rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-ink-secondary hover:bg-primary/10 hover:text-primary"
                            >
                              {tagName}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {task.projectId ? (projectNameById.get(task.projectId) ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={task.status}
                        label={translateTaskStatus(t, task.status)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge
                        priority={task.priority}
                        label={translatePriority(t, task.priority)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Progress value={task.progress} />
                        </div>
                        <span className="text-xs text-ink-secondary">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {timeline && <span className="text-ink-secondary">{timeline}</span>}
                        <span className={`text-xs font-medium ${DUE_LABEL_TONE_CLASSES[tone]}`}>
                          {formatDueLabel(task.dueDate, today, t, task)}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">
                      {task.risk ? (
                        <RiskBadge risk={task.risk} label={translateRisk(t, task.risk)} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden px-4 py-3 font-medium text-ink-primary xl:table-cell">
                      {task.smartScore ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TaskActions
                        task={task}
                        onComplete={(id) => completeTask(id).catch(reportError)}
                        onDelete={(id) => deleteTask(id).catch(reportError)}
                        onEdit={openEditDrawer}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-ink-secondary">
            <span>
              {t('tasks.showingRange', {
                from: (currentPage - 1) * PAGE_SIZE + 1,
                to: Math.min(currentPage * PAGE_SIZE, sortedTasks.length),
                total: sortedTasks.length,
              })}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                      pageNumber === currentPage
                        ? 'bg-primary text-white'
                        : 'text-ink-secondary hover:bg-surface-secondary'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
