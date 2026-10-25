import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, LifeBuoy, Search, X } from 'lucide-react';
import { openExternal } from '../lib/openExternal';

export const SUPPORT_EMAIL = 'thinlam6@gmail.com';

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
        <path d="M17 13.5v7M13.5 17h7" />
      </svg>
    </span>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex h-16 items-center gap-2 px-1 text-sm font-medium transition-colors ${
    isActive
      ? 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
      : 'text-ink-secondary hover:text-ink-primary'
  }`;

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = location.pathname === '/' ? (params.get('q') ?? '') : '';

  // Ctrl/⌘+K jumps straight to search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setQuery = (value: string) => {
    const next = value ? `/?q=${encodeURIComponent(value)}` : '/';
    // Replace while typing on the catalogue so Back doesn't step through keystrokes.
    navigate(next, { replace: location.pathname === '/' });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <BrandMark />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-primary">GiaoTrinh Code</p>
            <p className="text-xs text-ink-muted">App Hub</p>
          </div>
        </Link>

        <nav className="flex items-center gap-6" aria-label="Điều hướng chính">
          <NavLink to="/" end className={navClass}>
            Ứng dụng
          </NavLink>
          <NavLink to="/guide" className={navClass}>
            <BookOpen className="h-4 w-4" />
            Hướng dẫn
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden w-64 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('');
                  inputRef.current?.blur();
                }
              }}
              placeholder="Tìm ứng dụng"
              aria-label="Tìm ứng dụng"
              className="h-9 w-full rounded-lg border border-border bg-surface-secondary pl-9 pr-16 text-sm text-ink-primary outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                Ctrl K
              </kbd>
            )}
          </div>

          <button
            onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Hỗ trợ App Hub')}`)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink-primary"
          >
            <LifeBuoy className="h-4 w-4" />
            Hỗ trợ
          </button>
        </div>
      </div>
    </header>
  );
}
