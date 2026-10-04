import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Priority, Project, ProjectHealth } from '@stm/types';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List } from 'lucide-react';
import {
  computeProjectHealth,
  computeProjectMetrics,
  getProjectDerivedPriority,
  getProjectNextAction,
  type ProjectMetrics,
} from '@stm/shared';
import { EmptyState, HelpButton, PriorityBadge, ProjectHealthBadge, StatCard } from '@stm/ui';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { translatePriority, translateProjectHealth } from '../../lib/enumLabels';
import { ProjectRow } from './ProjectRow';

type ViewTab = 'All' | ProjectHealth;
type ViewMode = 'grid' | 'list';
type SortMode = 'healthRisk' | 'progress' | 'name';

const HEALTH_ORDER: ProjectHealth[] = ['Critical', 'At Risk', 'Attention', 'Healthy'];
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];
const HEALTH_BAR_CLASS: Record<ProjectHealth, string> = {
  Healthy: 'bg-risk-low',
  Attention: 'bg-risk-medium',
  'At Risk': 'bg-risk-high',
  Critical: 'bg-risk-critical',
};

const controlClasses =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Frame 11 (Projects), redesigned: health-filter tabs, a Priority
 * filter + Sort control, a grid/list view toggle, richer cards (derived
 * priority badge, Sep→Oct date range from linked tasks' real startDate,
 * a "View project →" link into Tasks pre-filtered to this project), and
 * a Portfolio Health bar + Smart Insights panel at the bottom.
 *
 * Adapted for this app's real data: no Owner field/filter and no member
 * avatars (single-user app, no team), and no "PRJ-0001" project code
 * (this app's Project entity has no such numbering). Priority is
 * derived from each project's own open tasks (getProjectDerivedPriority)
 * rather than invented, since Project itself has no priority field.
 */
export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, isLoading, addProject, deleteProject, openEditDrawer } = useProjectsContext();
  const { tasks } = useTasksContext();
  const [viewTab, setViewTab] = useState<ViewTab>('All');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('healthRisk');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const projectData = useMemo(
    () =>
      projects.map((project) => {
        const metrics = computeProjectMetrics(project, tasks);
        const health = computeProjectHealth(metrics);
        const priority = getProjectDerivedPriority(metrics);
        return { project, metrics, health, priority };
      }),
    [projects, tasks],
  );

  const summary = useMemo(() => {
    if (projectData.length === 0) {
      return { active: 0, healthy: 0, attention: 0, atRisk: 0, critical: 0, totalTasks: 0, overdueTasks: 0, projectsWithOverdue: 0, blockedTasks: 0, avgProgress: 0 };
    }
    let active = 0;
    let healthy = 0;
    let attention = 0;
    let atRisk = 0;
    let critical = 0;
    let totalTasks = 0;
    let overdueTasks = 0;
    let projectsWithOverdue = 0;
    let blockedTasks = 0;
    let progressSum = 0;

    for (const { metrics, health } of projectData) {
      if (metrics.openCount > 0) active += 1;
      if (health === 'Healthy') healthy += 1;
      else if (health === 'Attention') attention += 1;
      else if (health === 'At Risk') atRisk += 1;
      else critical += 1;
      totalTasks += metrics.taskCount;
      overdueTasks += metrics.overdueCount;
      if (metrics.overdueCount > 0) projectsWithOverdue += 1;
      blockedTasks += metrics.blockedCount;
      progressSum += metrics.progress;
    }

    return {
      active,
      healthy,
      attention,
      atRisk,
      critical,
      totalTasks,
      overdueTasks,
      projectsWithOverdue,
      blockedTasks,
      avgProgress: Math.round(progressSum / projectData.length),
    };
  }, [projectData]);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projectData.filter(({ project, health, priority }) => {
      if (viewTab !== 'All' && health !== viewTab) return false;
      if (priorityFilter !== 'All' && priority !== priorityFilter) return false;
      if (query && !project.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [projectData, viewTab, priorityFilter, search]);

  const sortedData = useMemo(() => {
    const sorted = filteredData.slice();
    switch (sortMode) {
      case 'progress':
        sorted.sort((a, b) => b.metrics.progress - a.metrics.progress);
        break;
      case 'name':
        sorted.sort((a, b) => a.project.name.localeCompare(b.project.name));
        break;
      default:
        sorted.sort(
          (a, b) => HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health),
        );
    }
    return sorted;
  }, [filteredData, sortMode]);

  const insights = useMemo(
    () =>
      projectData
        .filter(({ health }) => health !== 'Healthy')
        .sort((a, b) => HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health))
        .slice(0, 4)
        .map(({ project, metrics, health }) => ({
          id: project.id,
          health,
          text: `${project.name} ${t('projects.insightSeparator')} ${getProjectNextAction(metrics)}`,
        })),
    [projectData, t],
  );

  function handleAdd(name: string) {
    addProject({ name, area: 'Personal' }).catch(reportError);
  }

  function handleViewProject(project: Project) {
    navigate(`/tasks?project=${project.id}`);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('projects.loading')}</div>;
  }

  const TABS: { key: ViewTab; label: string; count: number }[] = [
    { key: 'All', label: t('projects.tabAll'), count: projectData.length },
    { key: 'Healthy', label: t('projects.tabHealthy'), count: summary.healthy },
    { key: 'Attention', label: t('projects.tabAttention'), count: summary.attention },
    { key: 'At Risk', label: t('projects.tabAtRisk'), count: summary.atRisk },
    { key: 'Critical', label: t('projects.tabCritical'), count: summary.critical },
  ];

  const healthCounts: { health: ProjectHealth; count: number }[] = [
    { health: 'Healthy', count: summary.healthy },
    { health: 'Attention', count: summary.attention },
    { health: 'At Risk', count: summary.atRisk },
    { health: 'Critical', count: summary.critical },
  ];
  const totalForBar = Math.max(projectData.length, 1);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('projects.title')}
          </h1>
          <HelpButton
            title={t('help.projects.title')}
            intro={t('help.projects.intro')}
            items={t('help.projects.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{t('projects.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('projects.statActive')}
          value={String(summary.active)}
          sub={t('projects.statActiveSubBreakdown', {
            healthy: summary.healthy,
            attention: summary.attention,
            atRisk: summary.atRisk,
          })}
          tone="primary"
        />
        <StatCard
          label={t('projects.statTotalTasks')}
          value={String(summary.totalTasks)}
          sub={t('projects.statTotalTasksSub', { count: projectData.length })}
          tone="info"
        />
        <StatCard
          label={t('projects.statOverdueTasks')}
          value={String(summary.overdueTasks)}
          sub={t('projects.statOverdueTasksSub', {
            projects: summary.projectsWithOverdue,
            total: projectData.length,
            blocked: summary.blockedTasks,
          })}
          tone={summary.overdueTasks > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t('projects.statAvgProgress')}
          value={`${summary.avgProgress}%`}
          sub={t('projects.statAvgProgressSub')}
          tone={
            summary.avgProgress >= 75 ? 'success' : summary.avgProgress >= 45 ? 'primary' : 'warning'
          }
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder={t('projects.quickCapturePlaceholder')} />

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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('projects.searchPlaceholder')}
            aria-label={t('projects.searchPlaceholder')}
            className={`${controlClasses} min-w-[160px]`}
          />
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
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label={t('projects.sortAriaLabel')}
            className={controlClasses}
          >
            <option value="healthRisk">{t('projects.sortHealthRisk')}</option>
            <option value="progress">{t('projects.sortProgress')}</option>
            <option value="name">{t('projects.sortName')}</option>
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label={t('projects.viewGrid')}
            className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-secondary'}`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label={t('projects.viewList')}
            className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-secondary'}`}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <EmptyState message={t('projects.emptyNoProjects')} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedData.map(({ project, metrics, health, priority }) => (
            <ProjectRow
              key={project.id}
              project={project}
              metrics={metrics}
              health={health}
              priority={priority}
              onEdit={openEditDrawer}
              onDelete={(id) => deleteProject(id).catch(reportError)}
              onView={() => handleViewProject(project)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-medium">{t('projects.colName')}</th>
                <th className="px-4 py-2 font-medium">{t('projects.colHealth')}</th>
                <th className="px-4 py-2 font-medium">{t('tasks.colPriority')}</th>
                <th className="px-4 py-2 font-medium">{t('taskDetail.statProgress')}</th>
                <th className="px-4 py-2 font-medium">{t('projects.chipOverdue')}</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.map(({ project, metrics, health, priority }) => (
                <tr key={project.id} className="hover:bg-surface-secondary">
                  <td className="px-4 py-3 font-medium text-ink-primary">{project.name}</td>
                  <td className="px-4 py-3">
                    <ProjectHealthBadge health={health} label={translateProjectHealth(t, health)} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={priority} label={translatePriority(t, priority)} />
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{metrics.progress}%</td>
                  <td className="px-4 py-3 text-ink-secondary">{metrics.overdueCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleViewProject(project)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t('projects.viewProjectLabel')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {projectData.length > 0 && (
        <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t('projects.portfolioHealthTitle')}
            </h2>
            <div className="flex h-2 w-full overflow-hidden rounded-pill bg-surface-secondary">
              {healthCounts.map(
                ({ health, count }) =>
                  count > 0 && (
                    <div
                      key={health}
                      className={HEALTH_BAR_CLASS[health]}
                      style={{ width: `${(count / totalForBar) * 100}%` }}
                    />
                  ),
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-secondary">
              {healthCounts.map(({ health, count }) => (
                <span key={health} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${HEALTH_BAR_CLASS[health]}`} aria-hidden="true" />
                  {translateProjectHealth(t, health)} {count}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t('projects.smartInsightsTitle')}
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                {t('inbox.ruleBasedLabel')}
              </span>
            </div>
            {insights.length === 0 ? (
              <p className="text-sm text-ink-secondary">{t('projects.allHealthyMessage')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {insights.map((insight) => (
                  <li key={insight.id} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${HEALTH_BAR_CLASS[insight.health]}`}
                      aria-hidden="true"
                    />
                    {insight.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
