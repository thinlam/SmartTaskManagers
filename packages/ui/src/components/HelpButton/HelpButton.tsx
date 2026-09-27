import { useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface HelpButtonProps {
  title: string;
  items: string[];
  /** Shown under the title, above the bullet list — e.g. one sentence framing the page's purpose. */
  intro?: string;
  closeLabel?: string;
  /** Accessible label for the "?" trigger button itself. */
  triggerLabel?: string;
}

/**
 * Per-page "?" help button — opens a small centered dialog listing what
 * the page does and how to use it. Every page gets its own `items` (i18n
 * `help.<page>.items`), so this component only renders; it holds no
 * page-specific copy itself.
 */
export function HelpButton({
  title,
  items,
  intro,
  closeLabel = 'Close',
  triggerLabel = 'Help',
}: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink-primary/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-lg"
            style={{
              marginTop: 'env(safe-area-inset-top)',
              marginBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {intro && <p className="mb-3 text-sm text-ink-secondary">{intro}</p>}
              <ul className="flex flex-col gap-2.5">
                {items.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm text-ink-primary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
