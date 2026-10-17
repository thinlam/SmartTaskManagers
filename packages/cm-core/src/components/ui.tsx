import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import type { Channel, ContentStatus, Priority } from '../api/types';
import { CHANNEL_META, PRIORITY_META, STATUS_META } from '../lib/meta';
import { cn, initials } from '../lib/format';

/* ───────────────────────── Buttons ───────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover disabled:bg-brand/50',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-50',
  ghost: 'text-ink-2 hover:bg-sunken disabled:opacity-50',
  danger: 'bg-bad text-white hover:bg-bad/90 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-sunken',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Surfaces ───────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface shadow-card', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────── Badges & avatars ───────────────────────── */

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: ContentStatus }) => (
  <Pill className={STATUS_META[status].badge}>{STATUS_META[status].label}</Pill>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Pill className={PRIORITY_META[priority].badge}>{PRIORITY_META[priority].label}</Pill>
);

const AVATAR_TINTS = [
  'bg-brand-soft text-brand',
  'bg-violet-soft text-violet',
  'bg-ok-soft text-ok',
  'bg-warn-soft text-warn',
  'bg-bad-soft text-bad',
];

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tint =
    AVATAR_TINTS[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        size === 'sm'
          ? 'h-6 w-6 text-[10px]'
          : size === 'lg'
            ? 'h-11 w-11 text-sm'
            : 'h-8 w-8 text-xs',
        tint,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width]',
          value >= 100 ? 'bg-ok' : 'bg-brand',
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ───────────────────────── Channel icons ───────────────────────── */

export function ChannelIcon({ channel, size = 28 }: { channel: Channel; size?: number }) {
  const s = { width: size, height: size };
  const c = CHANNEL_META[channel].color;
  switch (channel) {
    case 'Facebook':
      return (
        <svg {...s} viewBox="0 0 32 32" aria-label="Facebook">
          <circle cx="16" cy="16" r="16" fill={c} />
          <path
            fill="#fff"
            d="M17.6 25v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V7.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3h-2.7V17h2.7v8z"
          />
        </svg>
      );
    case 'TikTok':
      return (
        <svg {...s} viewBox="0 0 32 32" aria-label="TikTok">
          <circle cx="16" cy="16" r="16" fill={c} />
          <path
            fill="#fff"
            d="M21.2 11.3a4 4 0 0 1-1.6-3h-2.8v11.2a2.3 2.3 0 1 1-1.6-2.2v-2.9a5.2 5.2 0 1 0 4.4 5.1v-5.7a6.7 6.7 0 0 0 3.9 1.2V11.7a4 4 0 0 1-2.3-.4z"
          />
        </svg>
      );
    case 'YouTube':
      return (
        <svg {...s} viewBox="0 0 32 32" aria-label="YouTube">
          <circle cx="16" cy="16" r="16" fill={c} />
          <rect x="7" y="10" width="18" height="12" rx="3.5" fill="#fff" />
          <path fill={c} d="M14 13.2v5.6l5-2.8z" />
        </svg>
      );
    case 'Website':
      return (
        <svg {...s} viewBox="0 0 32 32" aria-label="Website">
          <circle cx="16" cy="16" r="16" fill={c} />
          <g fill="none" stroke="#fff" strokeWidth="1.6">
            <circle cx="16" cy="16" r="8" />
            <ellipse cx="16" cy="16" rx="3.6" ry="8" />
            <path d="M8 16h16" />
          </g>
        </svg>
      );
    case 'Zalo':
      return (
        <svg {...s} viewBox="0 0 32 32" aria-label="Zalo">
          <circle cx="16" cy="16" r="16" fill={c} />
          <text
            x="16"
            y="20"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill="#fff"
            fontFamily="Inter, Arial, sans-serif"
          >
            Zalo
          </text>
        </svg>
      );
  }
}

/* ───────────────────────── Form controls ───────────────────────── */

export const inputClass =
  'h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-sunken';

export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-bad">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-bad">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>
      )}
    </label>
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(inputClass, 'cursor-pointer appearance-none pr-9', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

/* ───────────────────────── Overlays & states ───────────────────────── */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[92vh] w-full flex-col rounded-t-xl bg-surface shadow-pop sm:rounded-xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-base font-bold">{title}</h3>
          <IconButton label="Đóng" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xóa',
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{message}</p>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-ink-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-2">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="max-w-md text-sm text-bad">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
