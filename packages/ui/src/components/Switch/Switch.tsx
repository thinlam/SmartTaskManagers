import { cn } from '../../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Required, not optional — same reasoning as IconButton: a bare toggle has no visible text of its own. */
  'aria-label': string;
  disabled?: boolean;
}

/**
 * Frame 02 (Component Library → Checkbox/Switch) — promised since Phase
 * 04, built now that Settings (Phase 19) is the first real need for it.
 * A plain `<button role="switch">`, not a hidden `<input type="checkbox">`
 * + styled label — simpler to keep in sync with `checked` from outside
 * (Settings has no form-submit step; every toggle updates state on click).
 */
export function Switch({ checked, onCheckedChange, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        checked ? 'bg-primary' : 'bg-surface-secondary',
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-pill bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  );
}
