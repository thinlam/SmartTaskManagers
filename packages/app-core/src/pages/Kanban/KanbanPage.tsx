import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Priority, Task, TaskStatus } from '@stm/types';
import { computeKanbanBoardData, type KanbanSortMode } from '@stm/shared';
import { HelpButton, StatCard } from '@stm/ui';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useSettingsContext } from '../../state/SettingsContext';
import { reportError } from '../../lib/reportError';
import { KanbanLane } from './KanbanLane';

type DueFilter = 'All' | 'overdue' | 'today' | 'week';

const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Ported from computeKanbanData_()/writeKanbanKpis_()/writeKanbanHeader_()
 * in apps/google-sheets/src/11_Kanban.gs — same 4 KPIs (Open Tasks/Due
 * Today/Overdue/Completed), same 5 lanes in TaskStatus order, same "Top
 * Focus" banner (highest-SmartScore open task). Redesigned per Frame 08:
 * a real filter bar (Project/Priority/Due date/Sort), colored lane
 * headers, a per-lane "+" that pre-fills the create drawer's status, a
 * legend explaining the Smart Score color coding, and — the user's
 * explicit ask — real drag-and-drop: dropping a card on another lane
 * calls updateTask(id, { status }) for real, no optimistic-only fake.
 *
 * No new context/store beyond that: Kanban reads TasksContext (tasks +
 * updateTask + the create/edit drawer) and ProjectsContext (to resolve
 * a card's `projectId` into a name for its meta line and to populate
 * the Project filter) — same cross-context read Projects/Goals already
 * established elsewhere.
 */
export function KanbanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, updateTask, openCreateDrawer } = useTasksContext();
  const { projects } = useProjectsContext();
  const { settings } = useSettingsContext();

  const [projectFilter, setProjectFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
  const [dueFilter, setDueFilter] = useState<DueFilter>('All');
  const [sortMode, setSortMode] = useState<KanbanSortMode>('smartScore');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks.filter((task) => {
      if (projectFilter !== 'All' && task.projectId !== projectFilter) return false;
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
      if (dueFilter !== 'All') {
        if (!task.dueDate) return false;
        const due = startOfDay(new Date(task.dueDate));
        if (dueFilter === 'overdue' && !(due.getTime() < today.getTime())) return false;
        if (dueFilter === 'today' && due.getTime() !== today.getTime()) return false;
        if (dueFilter === 'week' && !(due.getTime() >= today.getTime() && due.getTime() <= weekEnd.getTime())) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, projectFilter, priorityFilter, dueFilter]);

  const data = useMemo(
    () => computeKanbanBoardData(filteredTasks, settings.smartScoreEnabled, sortMode),
    [filteredTasks, settings.smartScoreEnabled, sortMode],
  );

  function handleSelectTask(task: Task) {
    navigate(`/tasks/${task.id}`);
  }

  function handleAddTask(status: TaskStatus) {
    openCreateDrawer({ status });
  }

  function handleDropTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || task.status === status) return;
    updateTask(taskId, { status }).catch(reportError);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('kanban.title')}
          </h1>
          <HelpButton
            title={t('help.kanban.title')}
            intro={t('help.kanban.intro')}
            items={t('help.kanban.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{t('kanban.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('kanban.statOpenTasks')}
          value={String(data.openCount)}
          sub={t('kanban.statOpenTasksSub')}
          tone="primary"
        />
        <StatCard
          label={t('kanban.statDueToday')}
          value={String(data.dueTodayCount)}
          sub={
            data.dueTodayCount > 0
              ? t('kanban.statDueTodaySubAttention')
              : t('kanban.statDueTodaySubNone')
          }
          tone={data.dueTodayCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label={t('kanban.statOverdue')}
          value={String(data.overdueCount)}
          sub={
            data.overdueCount > 0
              ? t('kanban.statOverdueSubResolve')
              : t('kanban.statOverdueSubClear')
          }
          tone={data.overdueCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t('kanban.statCompleted')}
          value={String(data.completedCount)}
          sub={t('kanban.statCompletedSub')}
          tone="success"
        />
      </section>

      <div
        className={
          data.focusTask
            ? 'flex items-center gap-2 rounded-md border border-primary/30 bg-primary-light px-3 py-2 text-sm font-semibold text-primary'
            : 'flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm font-semibold text-success'
        }
      >
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
        {data.focusTask ? (
          <span>
            {t('kanban.topFocus')} • {data.focusTask.title}
            {settings.smartScoreEnabled
              ? ` • ${t('kanban.scoreLabel', { score: data.focusTask.smartScore ?? 0 })}`
              : ''}
            {settings.explainRecommendations && data.focusTask.recommendedAction
              ? `  •  ${data.focusTask.recommendedAction}`
              : ''}
          </span>
        ) : (
          <span>{t('kanban.noFocusTask')}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as Priority | 'All')}
            aria-label={t('tasks.priorityFilterAriaLabel')}
            className={controlClasses}
          >
            <option value="All">{t('kanban.filterPriorityAll')}</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <select
            value={dueFilter}
            onChange={(event) => setDueFilter(event.target.value as DueFilter)}
            aria-label={t('kanban.filterDueDateAriaLabel')}
            className={controlClasses}
          >
            <option value="All">{t('kanban.filterDueDateAll')}</option>
            <option value="overdue">{t('kanban.filterDueDateOverdue')}</option>
            <option value="today">{t('kanban.filterDueDateToday')}</option>
            <option value="week">{t('kanban.filterDueDateWeek')}</option>
          </select>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as KanbanSortMode)}
            aria-label={t('kanban.sortAriaLabel')}
            className={controlClasses}
          >
            <option value="smartScore">{t('kanban.sortSmartScore')}</option>
            <option value="dueDate">{t('kanban.sortDueDate')}</option>
            <option value="priority">{t('kanban.sortPriority')}</option>
          </select>
        </div>
        <span className="text-xs text-ink-muted">
          {t('kanban.taskCountAndDragHint', { count: filteredTasks.length })}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.lanes.map((lane) => (
          <KanbanLane
            key={lane.status}
            lane={lane}
            today={data.today}
            projects={projects}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            onDropTask={handleDropTask}
            onCardDragStart={setDraggedTaskId}
            onCardDragEnd={() => setDraggedTaskId(null)}
            draggedTaskId={draggedTaskId}
            smartScoreEnabled={settings.smartScoreEnabled}
            explainRecommendations={settings.explainRecommendations}
          />
        ))}
      </div>

      {settings.smartScoreEnabled && (
        <p className="text-xs text-ink-muted">
          <span className="font-semibold uppercase tracking-wide">{t('kanban.legendTitle')}</span>{' '}
          {t('kanban.legendCritical')} · {t('kanban.legendVeryHigh')} · {t('kanban.legendHigh')} ·{' '}
          {t('kanban.legendNormal')}
          {' | '}
          {t('kanban.legendClickHint')} · {t('kanban.legendDragHint')}
        </p>
      )}
    </div>
  );
}
