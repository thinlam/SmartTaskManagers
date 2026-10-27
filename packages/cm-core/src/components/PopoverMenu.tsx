import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/format';

interface TriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
}

/**
 * A menu that opens under (or above, when there is no room) its trigger.
 * It is drawn in a portal with fixed positioning, so it is never clipped by a table, card or
 * scroll container the trigger happens to sit in.
 */
export function PopoverMenu({
  trigger,
  children,
  width = 192,
  align = 'start',
}: {
  trigger: (props: TriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = triggerRef.current?.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 0;
    if (!anchor) return;
    const margin = 8;
    const below = anchor.bottom + 4;
    const top =
      below + height + margin > window.innerHeight
        ? Math.max(margin, anchor.top - height - 4)
        : below;
    const wanted = align === 'end' ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(margin, wanted), window.innerWidth - width - margin);
    setPos({ top, left });
  }, [open, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((o) => !o),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
      })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="fixed z-[70] rounded-md border border-line bg-surface p-1 shadow-pop"
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  selected,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm',
        danger ? 'text-bad hover:bg-bad-soft' : 'hover:bg-sunken',
        selected && 'font-semibold',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
