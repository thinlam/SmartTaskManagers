import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Priority, Task, TaskStatus } from '@stm/types';
import {
  GANTT_PRIORITIES,
  computeGanttKpis,
  computeProjectHealth,
  computeProjectMetrics,
  getGanttBarPosition,
  getGanttVisibleRange,
  sortGanttTasks,
  stepGanttAnchor,
  type GanttScale,
} from '@stm/shared';
import { Button, HelpButton, IconButton, StatCard } from '@stm/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { reportError } from '../../lib/reportError';
import { translateProjectHealth } from '../../lib/enumLabels';
import { GanttGroupHeader } from './GanttGroupHeader';
import { GanttRow } from './GanttRow';

const LEFT_WIDTH = 480;
const STATUSES: TaskStatus[] = ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'];
const NO_PROJECT_KEY = '__no_project__';

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

function addDays(iso: string, delta: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function GanttPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasksContext();
  const { projects } = useProjectsContext();

  const [anchor, setAnchor] = useState(() => new Date());
  const [scale, setScale] = useState<GanttScale>('week');
  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const range = useMemo(() => getGanttVisibleRange(anchor, scale), [anchor, scale]);
  const today = new Date();

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (projectFilter !== 'All' && task.projectId !== projectFilter) return false;
        if (statusFilter !== 'All' && task.status !== statusFilter) return false;
        if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
        return true;
      }),
    [tasks, projectFilter, statusFilter, priorityFilter],
  );

  const visibleTasks = useMemo(
    () => filteredTasks.filter((task) => getGanttBarPosition(task, range, today) !== null),
    [filteredTasks, range],
  );

  const kpis = useMemo(() => computeGanttKpis(visibleTasks, today), [visibleTasks]);

  const groups = useMemo(() => {
    const byProject = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const key = task.projectId ?? NO_PROJECT_KEY;
      const list = byProject.get(key) ?? [];
      list.push(task);
      byProject.set(key, list);
    }

    const entries = Array.from(byProject.entries()).map(([key, groupTasks]) => {
      const project = key === NO_PROJECT_KEY ? undefined : projects.find((p) => p.id === key);
      const sorted = groupTasks.slice().sort(sortGanttTasks);

      let barRange: { startOffsetDays: number; spanDays: number } | null = null;
      const dayMs = 86_400_000;
      const starts = sorted.map((task) => new Date(task.startDate ?? task.dueDate!).getTime());
      const ends = sorted.map((task) => new Date(task.dueDate!).getTime());
      if (starts.length > 0) {
        const minStart = Math.min(...starts);
        const maxEnd = Math.max(...ends);
        if (maxEnd >= range.start.getTime() && minStart <= range.end.getTime()) {
          const startOffsetDays = Math.round((minStart - range.start.getTime()) / dayMs);
          const spanDays = Math.max(1, Math.round((maxEnd - minStart) / dayMs) + 1);
          barRange = { startOffsetDays, spanDays };
        }
      }

      let healthKey = '';
      let healthLabel = '';
      let progress = 0;
      if (project) {
        const metrics = computeProjectMetrics(project, tasks);
        const health = computeProjectHealth(metrics);
        healthKey = health;
        healthLabel = translateProjectHealth(t, health);
        progress = metrics.progress;
      } else {
        progress =
          sorted.length > 0
            ? Math.round(sorted.reduce((sum, task) => sum + task.progress, 0) / sorted.length)
            : 0;
      }

      return {
        key,
        name: project?.name ?? t('gantt.noProjectGroup'),
        healthKey,
        healthLabel,
        progress,
        tasks: sorted,
        barRange,
      };
    });

    entries.sort((a, b) => {
      if (a.key === NO_PROJECT_KEY) return 1;
      if (b.key === NO_PROJECT_KEY) return -1;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [filteredTasks, projects, tasks, range, t]);

  function handleSelectTask(task: Task) {
    navigate(`/tasks/${task.id}`);
  }

  function handleReschedule(task: Task, dayDelta: number) {
    if (!task.dueDate) return;
    const newDueDate = addDays(task.dueDate, dayDelta);
    const newStartDate = task.startDate ? addDays(task.startDate, dayDelta) : null;
    updateTask(task.id, { dueDate: newDueDate, startDate: newStartDate }).catch(reportError);
  }

  function toggleCollapsed(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const anchorLabel =
    scale === 'month'
      ? anchor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
      : `${range.start.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} – ${range.end.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('gantt.title')}
          </h1>
          <HelpButton
            title={t('help.gantt.title')}
            intro={t('help.gantt.intro')}
            items={t('help.gantt.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{t('gantt.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('calendar.prevMonthAriaLabel')}
            onClick={() => setAnchor((current) => stepGanttAnchor(current, scale, -1))}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            {t('calendar.todayButton')}
          </Button>
          <IconButton
            icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
            aria-label={t('calendar.nextMonthAriaLabel')}
            onClick={() => setAnchor((current) => stepGanttAnchor(current, scale, 1))}
          />
          <span className="ml-1 text-sm font-bold text-primary">{anchorLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            aria-label={t('tasks.projectFilterAriaLabel')}
            className={controlClasses}
          >
            <option value="All">{t('kanban.filterProjectAll')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TaskStatus | 'All')}
            aria-label={t('tasks.statusFilterAriaLabel')}
            className={controlClasses}
          >
            <option value="All">{t('tasks.allStatuses')}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as Priority | 'All')}
            aria-label={t('tasks.priorityFilterAriaLabel')}
            className={controlClasses}
          >
            <option value="All">{t('kanban.filterPriorityAll')}</option>
            {GANTT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <div className="flex rounded-md border border-border p-0.5">
            {(['day', 'week', 'month'] as GanttScale[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScale(mode)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  scale === mode
                    ? 'bg-primary text-white'
                    : 'text-ink-secondary hover:bg-surface-secondary'
                }`}
              >
                {t(`gantt.scale${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('gantt.statOnTrack')}
          value={String(kpis.onTrack)}
          sub={t('gantt.statOnTrackSub', {
            percent: kpis.scheduledCount > 0 ? Math.round((kpis.onTrack / kpis.scheduledCount) * 100) : 0,
          })}
          tone="success"
        />
        <StatCard
          label={t('gantt.statAtRisk')}
          value={String(kpis.atRisk)}
          sub={t('gantt.statAtRiskSub')}
          tone={kpis.atRisk > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label={t('gantt.statDelayed')}
          value={String(kpis.delayed)}
          sub={t('gantt.statDelayedSub')}
          tone={kpis.delayed > 0 ? 'danger' : 'success'}
          emphasize={kpis.delayed > 0}
        />
        <StatCard
          label={t('gantt.statAvgProgress')}
          value={`${kpis.avgProgress}%`}
          sub={t('gantt.statAvgProgressSub', { count: kpis.scheduledCount })}
          tone="primary"
        />
      </section>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div style={{ minWidth: LEFT_WIDTH + range.dayCount * range.dayWidth }}>
          <div className="flex border-b border-border bg-surface-secondary">
            <div
              style={{ width: LEFT_WIDTH }}
              className="sticky left-0 z-20 flex shrink-0 items-center gap-2 bg-surface-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary"
            >
              <span className="w-[170px] shrink-0">{t('gantt.colTask')}</span>
              <span className="w-[70px] shrink-0">{t('gantt.colProgress')}</span>
              <span className="w-[90px] shrink-0">{t('gantt.colSchedule')}</span>
              <span className="w-[80px] shrink-0">{t('gantt.colStatus')}</span>
            </div>
            <div className="relative flex shrink-0">
              {range.days.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{ width: range.dayWidth }}
                  className={`shrink-0 border-l border-border px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide ${
                    day.toDateString() === today.toDateString()
                      ? 'bg-primary-light text-primary'
                      : 'text-ink-muted'
                  }`}
                >
                  {range.dayWidth >= 50
                    ? day.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' })
                    : day.getDate()}
                </div>
              ))}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">{t('gantt.emptyState')}</div>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <GanttGroupHeader
                  name={group.name}
                  healthKey={group.healthKey}
                  healthLabel={group.healthLabel}
                  progress={group.progress}
                  taskCount={group.tasks.length}
                  isCollapsed={collapsed.has(group.key)}
                  onToggle={() => toggleCollapsed(group.key)}
                  range={range}
                  barPosition={group.barRange}
                  leftWidth={LEFT_WIDTH}
                />
                {!collapsed.has(group.key) &&
                  group.tasks.map((task) => (
                    <GanttRow
                      key={task.id}
                      task={task}
                      range={range}
                      barPosition={getGanttBarPosition(task, range, today)}
                      leftWidth={LEFT_WIDTH}
                      onSelectTask={() => handleSelectTask(task)}
                      onReschedule={(dayDelta) => handleReschedule(task, dayDelta)}
                    />
                  ))}
              </div>
            ))
          )}

          <div className="flex items-center justify-between gap-4 border-t border-border px-3 py-2 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-status-in-progress" aria-hidden="true" />
                {t('gantt.legendInProgress')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-status-waiting" aria-hidden="true" />
                {t('gantt.legendWaiting')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-status-to-do" aria-hidden="true" />
                {t('gantt.legendToDo')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
                {t('gantt.legendDelayed')}
              </span>
            </div>
            <span>{t('gantt.legendHint')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
