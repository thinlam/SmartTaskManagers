import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeProjectMetrics, computeProjectHealth } from '@stm/shared';
import { EmptyState, StatCard } from '@stm/ui';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useTasksContext } from '../../state/TasksContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { ProjectRow } from './ProjectRow';

/**
 * Frame 11 (Projects), adapted to Personal Mode. KPI row mirrors
 * writeProjectsKpis_() in apps/google-sheets/src/14_Projects.gs: Total
 * Projects, Active (open task count > 0), At Risk (health is "At Risk"
 * or "Critical"), Avg Progress. Health for every project is computed
 * live from tasks via @stm/shared — never stored or entered by hand.
 */
export function ProjectsPage() {
  const { t } = useTranslation();
  const { projects, isLoading, addProject, deleteProject, openEditDrawer } = useProjectsContext();
  const { tasks } = useTasksContext();

  const summary = useMemo(() => {
    if (projects.length === 0) {
      return { total: 0, active: 0, atRisk: 0, avgProgress: 0 };
    }

    let active = 0;
    let atRisk = 0;
    let progressSum = 0;

    for (const project of projects) {
      const metrics = computeProjectMetrics(project, tasks);
      const health = computeProjectHealth(metrics);
      if (metrics.openCount > 0) active += 1;
      if (health === 'At Risk' || health === 'Critical') atRisk += 1;
      progressSum += metrics.progress;
    }

    return {
      total: projects.length,
      active,
      atRisk,
      avgProgress: Math.round(progressSum / projects.length),
    };
  }, [projects, tasks]);

  function handleAdd(name: string) {
    addProject({ name, area: 'Personal' }).catch(reportError);
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('projects.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
          {t('projects.title')}
        </h1>
        <p className="text-sm text-ink-secondary">{t('projects.subtitle')}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('projects.statTotal')}
          value={String(summary.total)}
          sub={t('projects.statTotalSub')}
          tone="primary"
        />
        <StatCard
          label={t('projects.statActive')}
          value={String(summary.active)}
          sub={t('projects.statActiveSub')}
          tone="info"
        />
        <StatCard
          label={t('projects.statAtRisk')}
          value={String(summary.atRisk)}
          sub={
            summary.atRisk > 0 ? t('projects.statAtRiskSubDanger') : t('projects.statAtRiskSubOk')
          }
          tone={summary.atRisk > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t('projects.statAvgProgress')}
          value={`${summary.avgProgress}%`}
          sub={t('projects.statAvgProgressSub')}
          tone={
            summary.avgProgress >= 75
              ? 'success'
              : summary.avgProgress >= 45
                ? 'primary'
                : 'warning'
          }
        />
      </section>

      <QuickCaptureInput onAdd={handleAdd} placeholder={t('projects.quickCapturePlaceholder')} />

      {projects.length === 0 ? (
        <EmptyState message={t('projects.emptyNoProjects')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              allTasks={tasks}
              onEdit={openEditDrawer}
              onDelete={(id) => deleteProject(id).catch(reportError)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
