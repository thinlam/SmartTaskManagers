import { useMemo, useState } from 'react';
import type { Priority, Task } from '@stm/types';
import { formatDueLabel, parseQuickCapture } from '@stm/shared';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, HelpButton, PriorityBadge, StatCard } from '@stm/ui';
import { useTasksContext } from '../../state/TasksContext';
import { useProjectsContext } from '../../state/ProjectsContext';
import { QuickCaptureInput } from '../../components/QuickCaptureInput';
import { reportError } from '../../lib/reportError';
import { translatePriority } from '../../lib/enumLabels';

type ViewTab = 'all' | 'needsOrganizing' | 'smartMatched' | 'aging';

const AGING_DAYS_THRESHOLD = 3;
const PRIORITIES: Priority[] = ['Critical', 'Urgent', 'High', 'Medium', 'Low'];

function daysSince(iso: string, referenceDate: Date): number {
  const created = new Date(iso);
  return Math.floor((referenceDate.getTime() - created.getTime()) / 86_400_000);
}

/** Rule-based project suggestion: does the task's own title text contain a real project's name? No AI call — same "Rule-based · no AI used" guarantee as Frame 10.1.1's mockup. */
function suggestProjectId(title: string, projects: { id: string; name: string }[]): string | undefined {
  const lower = title.toLowerCase();
  return projects.find((project) => lower.includes(project.name.toLowerCase()))?.id;
}

/**
 * Frame 10.1.1 (Inbox), redesigned: a real table (Item/Project/Priority/
 * Due) instead of the TaskCard list, quick-filter tabs, 4 KPI tiles, a
 * rule-based "smart suggestion" (title text matched against real
 * project names — no AI/LLM call, matching the mockup's own "Rule-based
 * · no AI used" label), and a side "Organize Item" panel to triage one
 * task at a time without opening the full edit drawer.
 *
 * Adapted for this app's real data: no "@owner" token in Quick Capture
 * and no Owner field in the Organize panel (single-user app — every
 * task already belongs to the signed-in user). "Processed this week" is
 * an honest approximation (tasks outside Inbox touched in the last 7
 * days via their real updatedAt) since there's no field-level audit log
 * to know precisely when each item left Inbox.
 */
export function InboxPage() {
  const { t, i18n } = useTranslation();
  const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasksContext();
  const { projects } = useProjectsContext();
  const [captureHint, setCaptureHint] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelProjectId, setPanelProjectId] = useState('');
  const [panelPriority, setPanelPriority] = useState<Priority>('Medium');
  const [panelDueDate, setPanelDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(() => new Date(), []);
  const inboxTasks = useMemo(() => tasks.filter((task) => task.status === 'Inbox'), [tasks]);

  const suggestions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of inboxTasks) {
      if (task.projectId) continue;
      const suggested = suggestProjectId(task.title, projects);
      if (suggested) map.set(task.id, suggested);
    }
    return map;
  }, [inboxTasks, projects]);

  const agingTasks = useMemo(
    () => inboxTasks.filter((task) => daysSince(task.createdAt, today) >= AGING_DAYS_THRESHOLD),
    [inboxTasks, today],
  );

  const needsOrganizingTasks = useMemo(
    () =>
      inboxTasks.filter(
        (task) => !task.projectId && task.priority === 'Medium' && !task.dueDate,
      ),
    [inboxTasks],
  );

  const smartMatchedTasks = useMemo(
    () => inboxTasks.filter((task) => suggestions.has(task.id)),
    [inboxTasks, suggestions],
  );

  const processedThisWeekCount = useMemo(() => {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return tasks.filter((task) => task.status !== 'Inbox' && new Date(task.updatedAt) >= weekAgo)
      .length;
  }, [tasks, today]);

  const oldestItemDays = useMemo(() => {
    if (inboxTasks.length === 0) return 0;
    return Math.max(...inboxTasks.map((task) => daysSince(task.createdAt, today)));
  }, [inboxTasks, today]);

  const tabTasks = useMemo(() => {
    switch (viewTab) {
      case 'needsOrganizing':
        return needsOrganizingTasks;
      case 'smartMatched':
        return smartMatchedTasks;
      case 'aging':
        return agingTasks;
      default:
        return inboxTasks;
    }
  }, [viewTab, inboxTasks, needsOrganizingTasks, smartMatchedTasks, agingTasks]);

  const selectedTask = inboxTasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedSuggestionProjectId = selectedTaskId ? suggestions.get(selectedTaskId) : undefined;
  const selectedSuggestionProject = selectedSuggestionProjectId
    ? projects.find((project) => project.id === selectedSuggestionProjectId)
    : undefined;

  function openOrganizePanel(task: Task) {
    setSelectedTaskId(task.id);
    setPanelProjectId(task.projectId ?? suggestions.get(task.id) ?? '');
    setPanelPriority(task.priority);
    setPanelDueDate(task.dueDate ?? '');
  }

  function closeOrganizePanel() {
    setSelectedTaskId(null);
  }

  function handleAdd(rawTitle: string) {
    const parsed = parseQuickCapture(rawTitle, projects);
    if (!parsed.title) return;
    addTask({
      title: parsed.title,
      area: 'Personal',
      projectId: parsed.projectId ?? null,
      priority: parsed.priority,
      dueDate: parsed.dueDate ?? null,
    }).catch(reportError);

    const parts: string[] = [];
    if (parsed.projectName) parts.push(t('inbox.captureHintProject', { project: parsed.projectName }));
    if (parsed.priority) parts.push(t('inbox.captureHintPriority', { priority: translatePriority(t, parsed.priority) }));
    if (parsed.dueDate) parts.push(t('inbox.captureHintDue', { date: parsed.dueDate }));
    setCaptureHint(parts.length > 0 ? parts.join(' · ') : null);
    window.setTimeout(() => setCaptureHint(null), 4000);
  }

  async function handleAcceptSuggestion(taskId: string, projectId: string) {
    setIsSaving(true);
    try {
      await updateTask(taskId, { projectId, status: 'To Do' });
      if (selectedTaskId === taskId) closeOrganizePanel();
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAcceptAllSuggestions() {
    setIsSaving(true);
    try {
      for (const task of smartMatchedTasks) {
        const projectId = suggestions.get(task.id);
        if (projectId) await updateTask(task.id, { projectId, status: 'To Do' });
      }
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveToTasks() {
    if (!selectedTask) return;
    setIsSaving(true);
    try {
      await updateTask(selectedTask.id, {
        status: 'To Do',
        projectId: panelProjectId || null,
        priority: panelPriority,
        dueDate: panelDueDate || null,
      });
      closeOrganizePanel();
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSnooze() {
    if (!selectedTask) return;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isoTomorrow = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    setIsSaving(true);
    try {
      await updateTask(selectedTask.id, { startDate: isoTomorrow });
      closeOrganizePanel();
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(taskId: string) {
    setIsSaving(true);
    try {
      await deleteTask(taskId);
      if (selectedTaskId === taskId) closeOrganizePanel();
    } catch (err) {
      reportError(err);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('inbox.loading')}</div>;
  }

  const TABS: { key: ViewTab; label: string; count: number }[] = [
    { key: 'all', label: t('inbox.tabAll'), count: inboxTasks.length },
    { key: 'needsOrganizing', label: t('inbox.tabNeedsOrganizing'), count: needsOrganizingTasks.length },
    { key: 'smartMatched', label: t('inbox.tabSmartMatched'), count: smartMatchedTasks.length },
    { key: 'aging', label: t('inbox.tabAging'), count: agingTasks.length },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('inbox.title')}
          </h1>
          <HelpButton
            title={t('help.inbox.title')}
            intro={t('help.inbox.intro')}
            items={t('help.inbox.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{t('inbox.subtitle')}</p>
      </header>

      <div className="flex flex-col gap-1.5">
        <QuickCaptureInput onAdd={handleAdd} placeholder={t('inbox.capturePlaceholder')} />
        <p className="text-xs text-ink-muted">{t('inbox.captureHintSyntax')}</p>
        {captureHint && <p className="text-xs font-medium text-primary">{captureHint}</p>}
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t('inbox.statInInbox')}
          value={String(inboxTasks.length)}
          sub={t('inbox.statInInboxSub')}
          tone="primary"
        />
        <StatCard
          label={t('inbox.statReadyToOrganize')}
          value={String(smartMatchedTasks.length)}
          sub={t('inbox.statReadyToOrganizeSub')}
          tone="info"
        />
        <StatCard
          label={t('inbox.statOldestItem')}
          value={t('inbox.statOldestItemValue', { count: oldestItemDays })}
          sub={
            oldestItemDays >= AGING_DAYS_THRESHOLD
              ? t('inbox.statOldestItemSubAging')
              : t('inbox.statOldestItemSubFresh')
          }
          tone={oldestItemDays >= AGING_DAYS_THRESHOLD ? 'warning' : 'success'}
        />
        <StatCard
          label={t('inbox.statProcessedThisWeek')}
          value={String(processedThisWeekCount)}
          sub={t('inbox.statProcessedThisWeekSub')}
          tone="success"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
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
            {smartMatchedTasks.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={handleAcceptAllSuggestions} disabled={isSaving}>
                {t('inbox.acceptAllSuggestions', { count: smartMatchedTasks.length })}
              </Button>
            )}
          </div>

          {tabTasks.length === 0 ? (
            <EmptyState message={t('inbox.emptyState')} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-2 font-medium">{t('inbox.colItem')}</th>
                    <th className="px-4 py-2 font-medium">{t('inbox.colProject')}</th>
                    <th className="px-4 py-2 font-medium">{t('inbox.colPriority')}</th>
                    <th className="px-4 py-2 font-medium">{t('inbox.colDue')}</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tabTasks.map((task) => {
                    const suggestedProjectId = suggestions.get(task.id);
                    const suggestedProject = suggestedProjectId
                      ? projects.find((p) => p.id === suggestedProjectId)
                      : undefined;
                    const isSelected = task.id === selectedTaskId;
                    return (
                      <tr
                        key={task.id}
                        onClick={() => openOrganizePanel(task)}
                        className={`cursor-pointer hover:bg-surface-secondary ${isSelected ? 'bg-primary-light/40' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-ink-primary">{task.title}</td>
                        <td className="px-4 py-3 text-ink-secondary">
                          {task.projectId
                            ? (projects.find((p) => p.id === task.projectId)?.name ?? '—')
                            : suggestedProject
                              ? (
                                  <span className="text-xs font-medium text-primary">
                                    {t('inbox.suggestedProject', { project: suggestedProject.name })}
                                  </span>
                                )
                              : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={task.priority} label={translatePriority(t, task.priority)} />
                        </td>
                        <td className="px-4 py-3 text-ink-secondary">
                          {formatDueLabel(task.dueDate, today, t)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openOrganizePanel(task);
                            }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {t('inbox.organizeAction')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:col-span-1">
          {selectedTask ? (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {t('inbox.organizeItemTitle')}
                  </span>
                  <span className="text-sm font-semibold text-ink-primary">{selectedTask.title}</span>
                  <span className="text-xs text-ink-muted">
                    {t('inbox.capturedLabel', {
                      time: new Date(selectedTask.createdAt).toLocaleString(i18n.language, {
                        day: '2-digit',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      }),
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeOrganizePanel}
                  className="text-ink-muted hover:text-ink-primary"
                  aria-label={t('common.close')}
                >
                  ×
                </button>
              </div>

              {selectedSuggestionProject && (
                <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary-light/40 p-3 text-xs text-primary">
                  <span className="font-semibold uppercase tracking-wide">
                    {t('inbox.smartSuggestionLabel')}
                  </span>
                  <p>{t('inbox.smartSuggestionText', { project: selectedSuggestionProject.name })}</p>
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcceptSuggestion(selectedTask.id, selectedSuggestionProject.id)}
                      disabled={isSaving}
                    >
                      {t('inbox.acceptSuggestionButton')}
                    </Button>
                    <span className="text-[10px] uppercase tracking-wide text-primary/70">
                      {t('inbox.ruleBasedLabel')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('tasks.fieldProject')}
                </span>
                <select
                  value={panelProjectId}
                  onChange={(event) => setPanelProjectId(event.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">{t('tasks.noProjectOption')}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('tasks.fieldPriority')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setPanelPriority(priority)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        panelPriority === priority
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border text-ink-secondary hover:bg-surface-secondary'
                      }`}
                    >
                      {translatePriority(t, priority)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t('tasks.fieldDueDate')}
                </span>
                <input
                  type="date"
                  value={panelDueDate}
                  onChange={(event) => setPanelDueDate(event.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <Button type="button" variant="primary" onClick={handleMoveToTasks} disabled={isSaving}>
                {t('inbox.moveToTasksButton')}
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleSnooze} disabled={isSaving}>
                  {t('inbox.snoozeButton')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedTask.id)}
                  disabled={isSaving}
                >
                  {t('tasks.deleteButton')}
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState message={t('inbox.selectItemHint')} />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-xs text-ink-muted">
        <span className="font-semibold uppercase tracking-wide text-ink-secondary">
          {t('inbox.howItWorksTitle')}
        </span>{' '}
        {t('inbox.howItWorksText')}
      </div>
    </div>
  );
}
