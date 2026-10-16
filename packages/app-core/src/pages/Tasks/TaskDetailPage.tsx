import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Pencil } from 'lucide-react';
import { formatDueLabel } from '@stm/shared';
import {
  Button,
  EmptyState,
  PriorityBadge,
  Progress,
  RiskBadge,
  StatCard,
  StatusBadge,
} from '@stm/ui';
import { translatePriority, translateRisk, translateTaskStatus } from '../../lib/enumLabels';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { useSettingsContext } from '../../state/SettingsContext';
import { reportError } from '../../lib/reportError';

type Tone = 'danger' | 'warning' | 'primary' | 'success';

/** >=85 "Critical Attention", >=65 "Needs Attention", >=40 "On Track", else "Low Priority" — same thresholds as getKanbanScoreTone (packages/shared), just with a label instead of a color. */
function scoreToneLabel(score: number): { tone: Tone; key: string } {
  if (score >= 85) return { tone: 'danger', key: 'critical' };
  if (score >= 65) return { tone: 'warning', key: 'needsAttention' };
  if (score >= 40) return { tone: 'primary', key: 'onTrack' };
  return { tone: 'success', key: 'lowPriority' };
}

const TONE_TEXT_CLASS: Record<Tone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  primary: 'text-primary',
  success: 'text-success',
};

const TONE_BG_CLASS: Record<Tone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  primary: 'bg-primary',
  success: 'bg-success',
};

/**
 * Frame 06 (Task Detail), adapted to this app's real data model. The
 * mockup includes several things this app has no backing data for —
 * Owner/team (single-user app), an Execution Plan subtask list, a
 * Dependencies graph, actual time-logged tracking, and a field-level
 * Activity audit log — none of that is fabricated here. Time Logged
 * became Estimate (task.estimateMinutes, real); Dependencies became a
 * 4th Smart Score stat tile instead; Activity shows only the two real
 * timestamps the Task entity actually carries (createdAt/updatedAt).
 * "Why this score" is built from real signals (priority, due-date
 * proximity, risk) rather than inventing a dependency-chain explanation.
 */
export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { tasks, isLoading, updateTask, completeTask, openEditDrawer } = useTasksContext();
  const { projects } = useProjectsContext();
  const { settings } = useSettingsContext();
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [progressDraft, setProgressDraft] = useState(0);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const task = useMemo(() => tasks.find((candidate) => candidate.id === id), [tasks, id]);

  const projectName = task?.projectId
    ? (projects.find((project) => project.id === task.projectId)?.name ?? null)
    : null;

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('tasks.loading')}</div>;
  }

  if (!task) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-8">
        <EmptyState message={t('taskDetail.notFound')} />
        <Button type="button" variant="secondary" onClick={() => navigate('/tasks')}>
          {t('taskDetail.backToTasks')}
        </Button>
      </div>
    );
  }

  const today = new Date();
  const dueLabel = formatDueLabel(task.dueDate, today, t);
  const isOverdueTask =
    task.status !== 'Completed' &&
    !!task.dueDate &&
    new Date(task.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  const estimateHours = task.estimateMinutes != null ? (task.estimateMinutes / 60).toFixed(1) : null;
  const score = scoreToneLabel(task.smartScore ?? 0);

  const whyBullets: { tone: Tone; text: string }[] = [];
  if (task.priority === 'Critical' || task.priority === 'Urgent') {
    whyBullets.push({ tone: 'danger', text: t('taskDetail.whyCriticalPriority', { priority: translatePriority(t, task.priority) }) });
  } else if (task.priority === 'High') {
    whyBullets.push({ tone: 'warning', text: t('taskDetail.whyHighPriority') });
  }
  if (task.dueDate) {
    const diffDays = Math.round(
      (new Date(task.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
    );
    if (diffDays < 0) {
      whyBullets.push({ tone: 'danger', text: t('taskDetail.whyOverdue', { count: Math.abs(diffDays) }) });
    } else if (diffDays === 0) {
      whyBullets.push({ tone: 'danger', text: t('taskDetail.whyDueToday') });
    } else if (diffDays <= 2) {
      whyBullets.push({ tone: 'warning', text: t('taskDetail.whyDueSoon', { count: diffDays }) });
    }
  }
  if (task.risk === 'Critical' || task.risk === 'High') {
    whyBullets.push({ tone: 'warning', text: t('taskDetail.whyHighRisk', { risk: translateRisk(t, task.risk) }) });
  }

  async function handleMarkComplete() {
    if (!task || task.status === 'Completed') return;
    setIsSaving(true);
    try {
      await completeTask(task.id);
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  function openProgressEditor() {
    if (!task) return;
    setProgressDraft(task.progress);
    setIsEditingProgress(true);
  }

  async function saveProgress() {
    if (!task) return;
    setIsSaving(true);
    try {
      await updateTask(task.id, { progress: progressDraft });
      setIsEditingProgress(false);
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  function openDeadlineEditor() {
    if (!task) return;
    setDeadlineDraft(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setIsEditingDeadline(true);
  }

  async function saveDeadline() {
    if (!task) return;
    setIsSaving(true);
    try {
      await updateTask(task.id, { dueDate: deadlineDraft || null });
      setIsEditingDeadline(false);
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
        <button type="button" onClick={() => navigate('/tasks')} className="hover:text-ink-primary">
          {t('tasks.title')}
        </button>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-ink-secondary">{task.title}</span>
      </nav>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {[projectName, task.area].filter(Boolean).join(' · ')}
            </span>
            <h1 className="text-2xl font-bold text-ink-primary">{task.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleMarkComplete}
              disabled={task.status === 'Completed' || isSaving}
            >
              {task.status === 'Completed' ? t('taskDetail.completed') : t('taskDetail.markComplete')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={openProgressEditor}>
              {t('taskDetail.updateProgress')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={openDeadlineEditor}>
              {t('taskDetail.changeDeadline')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openEditDrawer(task)}
              leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            >
              {t('taskDetail.editTask')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} label={translateTaskStatus(t, task.status)} />
          <PriorityBadge priority={task.priority} label={translatePriority(t, task.priority)} />
          {task.risk && <RiskBadge risk={task.risk} label={translateRisk(t, task.risk)} />}
        </div>

        {isEditingProgress && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progressDraft}
              onChange={(event) => setProgressDraft(Number(event.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-sm font-semibold text-ink-primary">{progressDraft}%</span>
            <Button type="button" variant="primary" size="sm" onClick={saveProgress} disabled={isSaving}>
              {t('taskDetail.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProgress(false)}>
              {t('taskDetail.cancel')}
            </Button>
          </div>
        )}

        {isEditingDeadline && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3">
            <input
              type="date"
              value={deadlineDraft}
              onChange={(event) => setDeadlineDraft(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary"
            />
            <Button type="button" variant="primary" size="sm" onClick={saveDeadline} disabled={isSaving}>
              {t('taskDetail.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingDeadline(false)}>
              {t('taskDetail.cancel')}
            </Button>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <StatCard label={t('taskDetail.statProgress')} value={`${task.progress}%`} sub={translateTaskStatus(t, task.status)} tone="primary" />
          <Progress value={task.progress} />
        </div>
        <div className="flex flex-col gap-2">
          <StatCard
            label={t('taskDetail.statEstimate')}
            value={estimateHours ? t('taskDetail.hoursValue', { hours: estimateHours }) : '—'}
            sub={t('taskDetail.statEstimateSub')}
            tone="info"
          />
        </div>
        <div className="flex flex-col gap-2">
          <StatCard
            label={t('taskDetail.statDeadline')}
            value={dueLabel}
            sub={task.dueDate ? new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            tone={isOverdueTask ? 'danger' : 'primary'}
            emphasize={isOverdueTask}
          />
        </div>
        <div className="flex flex-col gap-2">
          <StatCard
            label={t('taskDetail.statSmartScore')}
            value={settings.smartScoreEnabled ? String(task.smartScore ?? '—') : '—'}
            sub={settings.smartScoreEnabled ? t(`taskDetail.scoreLabel.${score.key}`) : t('taskDetail.smartScoreDisabled')}
            tone={settings.smartScoreEnabled ? score.tone : 'info'}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('taskDetail.taskInformation')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldProject')}
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {projectName ?? t('taskDetail.noProject')}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldArea')}
                </span>
                <span className="text-sm font-medium text-ink-primary">{task.area}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldTags')}
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {task.tags.length > 0 ? task.tags.join(', ') : t('taskDetail.noTags')}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldStartDate')}
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {task.startDate
                    ? new Date(task.startDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldDueDate')}
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {task.dueDate
                    ? `${new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })} · ${dueLabel}`
                    : '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('taskDetail.fieldCompletedDate')}
                </span>
                <span className="text-sm font-medium text-ink-primary">
                  {task.completedDate
                    ? new Date(task.completedDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('taskDetail.descriptionTitle')}
            </h2>
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm text-ink-primary">{task.description}</p>
            ) : (
              <EmptyState message={t('taskDetail.noDescription')} className="border-none" />
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink-primary">{t('taskDetail.smartIntelligence')}</h2>
            {settings.smartScoreEnabled ? (
              <>
                <div className="flex items-center justify-between">
                  <span className={`text-4xl font-bold ${TONE_TEXT_CLASS[score.tone]}`}>
                    {task.smartScore ?? '—'}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-semibold ${TONE_TEXT_CLASS[score.tone]}`}>
                      {t(`taskDetail.scoreLabel.${score.key}`)}
                    </span>
                    {settings.explainRecommendations && task.recommendedAction && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary">
                        {task.recommendedAction}
                      </span>
                    )}
                  </div>
                </div>
                <Progress value={task.smartScore ?? 0} tone={score.tone} />
                {whyBullets.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {t('taskDetail.whyThisScore')}
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {whyBullets.map((bullet, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-ink-secondary">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BG_CLASS[bullet.tone]}`}
                            aria-hidden="true"
                          />
                          {bullet.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyState message={t('taskDetail.smartScoreDisabledMessage')} className="border-none" />
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink-primary">{t('taskDetail.activity')}</h2>
            <ul className="flex flex-col gap-3 text-sm">
              {task.updatedAt !== task.createdAt && (
                <li className="flex flex-col">
                  <span className="font-medium text-ink-primary">{t('taskDetail.activityUpdated')}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(task.updatedAt).toLocaleString(i18n.language, {
                      day: '2-digit',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              )}
              <li className="flex flex-col">
                <span className="font-medium text-ink-primary">{t('taskDetail.activityCreated')}</span>
                <span className="text-xs text-ink-muted">
                  {new Date(task.createdAt).toLocaleString(i18n.language, {
                    day: '2-digit',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
