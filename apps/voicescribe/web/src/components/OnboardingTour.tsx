import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { clampStepIndex, markOnboardingSeen, ONBOARDING_STEPS } from '../lib/onboarding';
import type { Route } from '../types';
import { secondaryButtonClass, primaryButtonClass } from './ui';

const FIND_TARGET_TIMEOUT_MS = 1500;

/** First element matching `selector` that's actually visible on screen right now (non-zero size) — a selector can match a desktop-only/mobile-only duplicate of the same control. */
function findVisibleTarget(selector: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(selector);
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

/**
 * First-run guided tour (Việc 3 trong kế hoạch): tối màn hình, tô sáng từng
 * thành phần thật bằng một khung viền quanh nó, mũi tên/bong bóng mô tả.
 * Sống ở App.tsx's Shell nên nó có thể tự điều hướng giữa các trang mà các
 * bước cần (ví dụ "Ghi âm mới" rồi "Chi tiết bản ghi") — các bước nằm trên
 * trang Chi tiết cần một bản ghi đã xử lý xong để mở; nếu người dùng chưa có
 * bản ghi nào, các bước đó tự bỏ qua (không bao giờ chỉ mũi tên vào chỗ trống).
 */
export function OnboardingTour({
  route,
  onNavigate,
  onClose,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const sampleRecordingIdRef = useRef<string | null>(null);
  const noRecordingRef = useRef(false);
  const closedRef = useRef(false);

  const step = ONBOARDING_STEPS[clampStepIndex(stepIndex, ONBOARDING_STEPS.length)]!;

  function finish() {
    if (closedRef.current) return;
    closedRef.current = true;
    markOnboardingSeen();
    onClose();
  }

  function skip() {
    finish();
  }

  function advance(delta: 1 | -1) {
    setStepIndex((i) => {
      const next = i + delta;
      if (next >= ONBOARDING_STEPS.length) {
        finish();
        return i;
      }
      return clampStepIndex(next, ONBOARDING_STEPS.length);
    });
  }

  // Navigate to whatever page this step needs, resolve its target, recalculate
  // on resize/scroll. If the target never shows up (page has no such element
  // right now, or a 'detail' step but the user has no recording at all yet),
  // skip straight to the next step instead of leaving the arrow pointing at
  // nothing.
  useEffect(() => {
    let cancelled = false;
    setRect(null);

    async function resolvePage() {
      if (step.page === 'new') {
        if (route.page !== 'new') onNavigate({ page: 'new' });
        return true;
      }
      // step.page === 'detail'
      if (route.page === 'detail') return true;
      if (noRecordingRef.current) return false;
      if (sampleRecordingIdRef.current) {
        onNavigate({ page: 'detail', id: sampleRecordingIdRef.current });
        return true;
      }
      try {
        const page = await api.recordings.list({ page: 1, pageSize: 50 });
        const done = page.items.find((r) => r.status === 'done');
        if (!done) {
          noRecordingRef.current = true;
          return false;
        }
        sampleRecordingIdRef.current = done.id;
        onNavigate({ page: 'detail', id: done.id });
        return true;
      } catch {
        noRecordingRef.current = true;
        return false;
      }
    }

    void resolvePage().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        advance(1);
        return;
      }
      // Give the new page a frame (or a few, for async data) to mount before
      // looking for the target.
      const startedAt = Date.now();
      const poll = () => {
        if (cancelled) return;
        const el = findVisibleTarget(step.selector);
        if (el) {
          setRect(el.getBoundingClientRect());
          return;
        }
        if (Date.now() - startedAt > FIND_TARGET_TIMEOUT_MS) {
          advance(1);
          return;
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, route.page]);

  useEffect(() => {
    if (!rect) return;
    function recompute() {
      const el = findVisibleTarget(step.selector);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect !== null, step.selector]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        advance(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rect) return null;

  const pad = 8;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const bubbleBelow = top + height + 180 < window.innerHeight;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng">
      {/* Four dark strips around the target leave a see-through "spotlight" cutout — simpler and more robust across browsers than a box-shadow cutout trick. */}
      <div className="fixed bg-slate-900/70" style={{ top: 0, left: 0, right: 0, height: Math.max(0, top) }} />
      <div
        className="fixed bg-slate-900/70"
        style={{ top: top + height, left: 0, right: 0, bottom: 0 }}
      />
      <div className="fixed bg-slate-900/70" style={{ top, left: 0, width: Math.max(0, left), height }} />
      <div
        className="fixed bg-slate-900/70"
        style={{ top, left: left + width, right: 0, height }}
      />
      <div
        className="pointer-events-none fixed rounded-lg ring-2 ring-indigo-400"
        style={{ top, left, width, height }}
      />

      <div
        className="fixed w-[min(320px,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-xl"
        style={{
          top: bubbleBelow ? top + height + 12 : undefined,
          bottom: bubbleBelow ? undefined : window.innerHeight - top + 12,
          left: Math.min(Math.max(left, 16), window.innerWidth - 336),
        }}
      >
        <p className="text-xs font-medium text-indigo-500">
          {stepIndex + 1}/{ONBOARDING_STEPS.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={skip} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            Bỏ qua
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button onClick={() => advance(-1)} className={`${secondaryButtonClass} px-3 py-1.5 text-xs`}>
                Quay lại
              </button>
            )}
            <button onClick={() => advance(1)} className={`${primaryButtonClass} px-3 py-1.5 text-xs`}>
              {stepIndex === ONBOARDING_STEPS.length - 1 ? 'Hoàn tất' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
