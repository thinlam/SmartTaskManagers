import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SlidersHorizontal } from 'lucide-react';
import {
  EmptyState,
  HelpButton,
  PriorityDistributionChart,
  Progress,
  SmartInsightCard,
  StatCard,
  TaskCard,
  WeeklyTrendChart,
} from '@stm/ui';
import {
  computeDashboardData,
  getPriorityDistribution,
  getWeeklyCompletionTrend,
  type DashboardKpi,
  type DashboardKpiKey,
} from '@stm/shared';
import { translatePriority } from '../../lib/enumLabels';
import { useTasksContext } from '../../state/TasksContext';
import { useHabitsContext } from '../../state/HabitsContext';
import { useSettingsContext } from '../../state/SettingsContext';

const KPI_LAYOUT_STORAGE_KEY = 'stm.dashboard.kpiLayout';
const DEFAULT_KPI_ORDER: DashboardKpiKey[] = [
  'dueToday',
  'overdue',
  'focusTime',
  'weeklyProgress',
  'streak',
];

interface KpiLayoutEntry {
  key: DashboardKpiKey;
  visible: boolean;
}

/**
 * Dashboard customization (Phase 35) — which KPI cards show and in what
 * order, kept per-browser like theme/language rather than synced to the
 * backend: it's a display preference, not app data, and every key here
 * is a fixed literal (DashboardKpiKey), so there's no user-authored
 * content to worry about persisting correctly.
 */
function loadKpiLayout(): KpiLayoutEntry[] {
  try {
    const raw = localStorage.getItem(KPI_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KpiLayoutEntry[];
      const known = new Set(parsed.map((entry) => entry.key));
      const missing = DEFAULT_KPI_ORDER.filter((key) => !known.has(key)).map((key) => ({
        key,
        visible: true,
      }));
      return [...parsed, ...missing];
    }
  } catch {
    // Malformed/inaccessible storage (private browsing, quota) — fall back to defaults below.
  }
  return DEFAULT_KPI_ORDER.map((key) => ({ key, visible: true }));
}

/**
 * `packages/shared`'s computeDashboardData() has no i18n access, so its
 * `label`/`sub` on each KPI are English fallbacks only — this builds the
 * real, translated text from `kpi.key` and the raw numeric fields it
 * also carries.
 */
function translateKpi(t: TFunction, kpi: DashboardKpi): { label: string; sub: string } {
  switch (kpi.key) {
    case 'dueToday':
      return {
        label: t('dashboard.kpiDueToday'),
        sub: t('common.highPriorityCount', { count: kpi.highPriorityCount ?? 0 }),
      };
    case 'overdue':
      return {
        label: t('dashboard.kpiOverdue'),
        sub: (kpi.overdueCount ?? 0) > 0 ? t('common.needsAttention') : t('common.allClearShort'),
      };
    case 'focusTime':
      return {
        label: t('dashboard.kpiFocusTime'),
        sub: t('common.ofDailyCapacity', { percent: kpi.focusLoadPercent ?? 0 }),
      };
    case 'weeklyProgress':
      return {
        label: t('dashboard.kpiWeeklyProgress'),
        sub:
          (kpi.weekTaskCount ?? 0) > 0
            ? t('common.completedOfTarget', {
                completed: kpi.weekCompletedCount ?? 0,
                target: kpi.weekTaskCount ?? 0,
              })
            : t('common.noTasksThisWeek'),
      };
    case 'streak':
      return {
        label: t('dashboard.kpiStreak'),
        sub: t('common.streakDays', { count: kpi.streakCount ?? 0 }),
      };
  }
}

/**
 * Frame 03 (Dashboard), adapted to Personal Mode: KPI row, Focus Now,
 * My Areas (replaces the team version's per-project "Project Health" +
 * "Team Capacity" — Personal Mode has no team, so this groups by Area,
 * matching apps/google-sheets/src/06_Dashboard.gs's getAreaProgress_()),
 * and Smart Insights. Real data since Phase 30 — computeDashboardData()
 * (packages/shared) reads tasks/habits straight from TasksContext/
 * HabitsContext, both already backend-backed since Phase 27; smartScore/
 * recommendedAction on each task are the real Smart Engine output
 * (Phase 29), not fabricated.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { tasks, isLoading: tasksLoading } = useTasksContext();
  const { habits, isLoading: habitsLoading } = useHabitsContext();
  const { settings } = useSettingsContext();
  const [kpiLayout, setKpiLayout] = useState<KpiLayoutEntry[]>(loadKpiLayout);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const dragKeyRef = useRef<DashboardKpiKey | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KPI_LAYOUT_STORAGE_KEY, JSON.stringify(kpiLayout));
    } catch {
      // Ignore storage failures — layout just won't persist this session.
    }
  }, [kpiLayout]);

  function toggleKpiVisible(key: DashboardKpiKey) {
    setKpiLayout((layout) =>
      layout.map((entry) => (entry.key === key ? { ...entry, visible: !entry.visible } : entry)),
    );
  }

  function moveKpi(sourceKey: DashboardKpiKey, targetKey: DashboardKpiKey) {
    setKpiLayout((layout) => {
      const sourceIndex = layout.findIndex((entry) => entry.key === sourceKey);
      const targetIndex = layout.findIndex((entry) => entry.key === targetKey);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return layout;
      const next = layout.slice();
      const [moved] = next.splice(sourceIndex, 1);
      if (!moved) return layout;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  const data = useMemo(
    () =>
      computeDashboardData(tasks, habits, new Date(), t, {
        smartScoreEnabled: settings.smartScoreEnabled,
        explainRecommendations: settings.explainRecommendations,
        scheduleOverloadWarning: settings.scheduleOverloadWarning,
      }),
    [tasks, habits, t, settings],
  );

  const weeklyTrend = useMemo(
    () =>
      getWeeklyCompletionTrend(tasks, new Date()).map((day) => {
        const [year, month, date] = day.dateKey.split('-').map(Number) as [number, number, number];
        return {
          label: new Date(year, month - 1, date).toLocaleDateString(i18n.language, {
            weekday: 'short',
          }),
          completedCount: day.completedCount,
        };
      }),
    [tasks, i18n.language],
  );

  const priorityDistribution = useMemo(
    () =>
      getPriorityDistribution(tasks).map((item) => ({
        priority: item.priority,
        label: translatePriority(t, item.priority),
        count: item.count,
      })),
    [tasks, t],
  );

  const kpiByKey = new Map(data.kpis.map((kpi) => [kpi.key, kpi]));
  const visibleKpis = kpiLayout
    .filter((entry) => entry.visible)
    .map((entry) => kpiByKey.get(entry.key))
    .filter((kpi): kpi is DashboardKpi => Boolean(kpi));

  if (tasksLoading || habitsLoading) {
    return <div className="p-8 text-sm text-ink-muted">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-bold leading-[34px] text-ink-primary">
            {t('dashboard.title')}
          </h1>
          <HelpButton
            title={t('help.dashboard.title')}
            intro={t('help.dashboard.intro')}
            items={t('help.dashboard.items', { returnObjects: true }) as string[]}
            closeLabel={t('common.close')}
          />
        </div>
        <p className="text-sm text-ink-secondary">{data.greeting}</p>
        <p className="text-xs text-ink-muted">{data.summary}</p>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsCustomizeOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {t('dashboard.customize')}
          </button>
        </div>

        {isCustomizeOpen && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-3">
            {kpiLayout.map((entry) => {
              const kpi = kpiByKey.get(entry.key);
              if (!kpi) return null;
              const { label } = translateKpi(t, kpi);
              return (
                <label
                  key={entry.key}
                  className="flex items-center gap-2 text-sm text-ink-primary"
                >
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={() => toggleKpiVisible(entry.key)}
                    className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visibleKpis.map((kpi) => {
            const { label, sub } = translateKpi(t, kpi);
            return (
              <div
                key={kpi.key}
                draggable
                onDragStart={() => {
                  dragKeyRef.current = kpi.key;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragKeyRef.current && dragKeyRef.current !== kpi.key) {
                    moveKpi(dragKeyRef.current, kpi.key);
                  }
                  dragKeyRef.current = null;
                }}
                className="cursor-grab active:cursor-grabbing"
                title={t('dashboard.dragToReorder')}
              >
                <StatCard label={label} value={kpi.value} sub={sub} tone={kpi.tone} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-primary">{t('dashboard.focusNow')}</h2>
        {data.focusNow.length === 0 ? (
          <EmptyState message={t('dashboard.focusNowEmpty')} />
        ) : (
          <div className="flex flex-col gap-2">
            {data.focusNow.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                meta={task.area}
                dueLabel={task.dueLabel}
                priority={task.priority}
                priorityLabel={translatePriority(t, task.priority)}
                smartScore={task.smartScore}
                recommendedAction={task.recommendedAction}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink-primary">
            {t('dashboard.weeklyTrendTitle')}
          </h2>
          <WeeklyTrendChart data={weeklyTrend} countLabel={t('dashboard.weeklyTrendCountLabel')} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink-primary">
            {t('dashboard.priorityDistributionTitle')}
          </h2>
          {priorityDistribution.every((item) => item.count === 0) ? (
            <EmptyState message={t('dashboard.priorityDistributionEmpty')} className="border-none" />
          ) : (
            <PriorityDistributionChart data={priorityDistribution} />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">{t('dashboard.myAreas')}</h2>
          {data.areas.length === 0 ? (
            <EmptyState message={t('dashboard.myAreasEmpty')} />
          ) : (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
              {data.areas.map((area) => (
                <div key={area.area} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-primary">{area.area}</span>
                    <span className="text-ink-secondary">{area.progress}%</span>
                  </div>
                  <Progress value={area.progress} />
                  <span className="text-xs text-ink-muted">
                    {t('dashboard.areaStats', {
                      completed: area.completed,
                      open: area.open,
                      total: area.total,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-primary">{t('dashboard.smartInsights')}</h2>
          {data.insights.length === 0 ? (
            <EmptyState message={t('dashboard.smartInsightsEmpty')} />
          ) : (
            <div className="flex flex-col gap-2">
              {data.insights.map((insight) => (
                <SmartInsightCard key={insight.text} tone={insight.tone}>
                  {insight.text}
                </SmartInsightCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
