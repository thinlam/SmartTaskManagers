import type { TodayReview } from '@stm/shared';
import { useTranslation } from 'react-i18next';
import { Progress } from '@stm/ui';

interface EndOfDayReviewProps {
  review: TodayReview;
}

/** Mirrors writeEndOfDayReview_() in apps/google-sheets/src/07_Today.gs. */
export function EndOfDayReview({ review }: EndOfDayReviewProps) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink-primary">{t('today.endOfDayReview')}</h2>
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('today.todaysProgress')}
          </span>
          <span className="text-lg font-bold text-ink-primary">
            {t('today.completedCount', { count: review.completedCount })}
          </span>
          <span className="text-xs text-ink-secondary">
            {review.plannedCount > 0
              ? t('today.completionRatePlanned', { rate: review.completionRate })
              : t('today.noPlannedTasks')}
          </span>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-ink-muted">
              {t('today.completion')}
            </span>
            <span className="text-ink-secondary">{review.completionRate}%</span>
          </div>
          <Progress
            value={review.completionRate}
            tone={review.completionRate >= 70 ? 'success' : 'primary'}
          />
        </div>
      </div>
    </section>
  );
}
