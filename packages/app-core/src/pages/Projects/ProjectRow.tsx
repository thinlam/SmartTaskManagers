import type { Project, Task } from '@stm/types';
import {
  computeProjectMetrics,
  computeProjectHealth,
  getProjectTopFocusText,
  getProjectNextAction,
  formatTargetLabel,
} from '@stm/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton, ProjectCard, type ProjectCardMetricChip } from '@stm/ui';

interface ProjectRowProps {
  project: Project;
  allTasks: Task[];
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

export function ProjectRow({ project, allTasks, onEdit, onDelete }: ProjectRowProps) {
  const { t } = useTranslation();
  const metrics = computeProjectMetrics(project, allTasks);
  const health = computeProjectHealth(metrics);

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
        targetLabel={formatTargetLabel(project.targetDate)}
        health={health}
        progress={metrics.progress}
        chips={chips}
        topFocusText={getProjectTopFocusText(metrics)}
        hasTopTask={metrics.topTask !== null}
        nextActionText={getProjectNextAction(metrics)}
      />
    </div>
  );
}
