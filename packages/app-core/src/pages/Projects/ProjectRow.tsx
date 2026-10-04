import type { Priority, Project, ProjectHealth } from '@stm/types';
import type { ProjectMetrics } from '@stm/shared';
import {
  getProjectTopFocusText,
  getProjectNextAction,
  formatProjectDateRange,
} from '@stm/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton, ProjectCard, type ProjectCardMetricChip } from '@stm/ui';
import { translatePriority, translateProjectHealth } from '../../lib/enumLabels';

interface ProjectRowProps {
  project: Project;
  metrics: ProjectMetrics;
  health: ProjectHealth;
  priority: Priority;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onView: () => void;
}

export function ProjectRow({ project, metrics, health, priority, onEdit, onDelete, onView }: ProjectRowProps) {
  const { t } = useTranslation();

  const chips: ProjectCardMetricChip[] = [
    { label: t('projects.chipOpen'), value: metrics.openCount, tone: 'info' },
    { label: t('projects.chipDone'), value: metrics.completedCount, tone: 'success' },
    {
      label: t('projects.chipOverdue'),
      value: metrics.overdueCount,
      tone: metrics.overdueCount > 0 ? 'danger' : 'neutral',
    },
    {
      label: t('projects.chipWaiting'),
      value: metrics.blockedCount,
      tone: metrics.blockedCount > 0 ? 'warning' : 'neutral',
    },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end gap-1">
        <IconButton
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('projects.editAriaLabel', { name: project.name })}
          size="sm"
          onClick={() => onEdit(project)}
        />
        <IconButton
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('projects.deleteAriaLabel', { name: project.name })}
          variant="danger"
          size="sm"
          onClick={() => onDelete(project.id)}
        />
      </div>
      <ProjectCard
        name={project.name}
        area={project.area}
        targetLabel={formatProjectDateRange(metrics.earliestStartDate, project.targetDate)}
        health={health}
        healthLabel={translateProjectHealth(t, health)}
        progress={metrics.progress}
        progressLabel={t('common.percentComplete', { progress: metrics.progress })}
        chips={chips}
        topFocusText={getProjectTopFocusText(metrics)}
        topFocusLabel={t('common.topFocus')}
        hasTopTask={metrics.topTask !== null}
        nextActionText={getProjectNextAction(metrics)}
        nextLabel={t('common.next')}
        priority={priority}
        priorityLabel={translatePriority(t, priority)}
        onViewProject={onView}
        viewProjectLabel={t('projects.viewProjectLabel')}
      />
    </div>
  );
}
