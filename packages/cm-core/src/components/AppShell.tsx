import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CalendarDays,
  Columns3,
  FileText,
  Home,
  Image as ImageIcon,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import type { Activity } from '../api/types';
import { useAsync, useAuth } from '../state/AppState';
import { cn, fmtBytes, timeAgo } from '../lib/format';
import { Avatar, Button, IconButton, ProgressBar } from './ui';
import { activityText } from '../lib/activity';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="11" fill="#2563eb" />
      <path
        d="M26.5 14.2A8.4 8.4 0 1 0 26.5 25.8"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Tổng quan', icon: Home, end: true },
  { to: '/contents', label: 'Nội dung', icon: FileText },
  { to: '/calendar', label: 'Lịch đăng', icon: CalendarDays },
  { to: '/kanban', label: 'Kanban', icon: Columns3 },
  { to: '/media', label: 'Thư viện media', icon: ImageIcon },
  { to: '/campaigns', label: 'Chiến dịch', icon: Megaphone },
  { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { to: '/members', label: 'Thành viên', icon: Users },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

const BOTTOM = [NAV[0]!, NAV[1]!, NAV[2]!, NAV[3]!];

const TITLES: [string, string][] = [
  ['/contents/new', 'Tạo mới'],
  ['/contents/', 'Chỉnh sửa'],
  ['/contents', 'Nội dung'],
  ['/calendar', 'Lịch đăng'],
  ['/kanban', 'Kanban'],
  ['/media', 'Thư viện media'],
  ['/campaigns', 'Chiến dịch'],
  ['/reports', 'Báo cáo'],
  ['/members', 'Thành viên'],
  ['/settings', 'Cài đặt'],
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Điều hướng chính">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-sunken hover:text-ink',
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function StorageMeter() {
  const { data } = useAsync(() => api.media.usage(), []);
  if (!data) return null;
  const pct = Math.min(100, (data.usedBytes / data.limitBytes) * 100);
  return (
    <div className="mx-3 mb-3 rounded-md border border-line bg-canvas p-3 text-xs text-ink-2">
      <p className="font-semibold text-ink">Dung lượng đã dùng</p>
      <p className="mt-1">
        {fmtBytes(data.usedBytes)} / {fmtBytes(data.limitBytes)}
      </p>
      <ProgressBar value={pct} className="mt-2" />
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useAsync<Activity[]>(
    () => (open ? api.activities(8) : Promise.resolve([])),
    [open],
  );
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <IconButton label="Hoạt động gần đây" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 shadow-pop">
          <p className="mb-2 text-sm font-bold">Hoạt động gần đây</p>
          {!data?.length ? (
            <p className="py-6 text-center text-sm text-ink-3">Chưa có hoạt động nào.</p>
          ) : (
            <ul className="space-y-3">
              {data.map((a) => (
                <li key={a.id} className="flex gap-2 text-sm">
                  <Avatar name={a.user?.fullName ?? '?'} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="leading-snug text-ink">{activityText(a)}</p>
                    <p className="text-xs text-ink-3">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Tài khoản"
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center rounded-full outline-none ring-brand/30 focus-visible:ring-2"
      >
        <Avatar name={user.fullName} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-60 rounded-lg border border-line bg-surface p-2 shadow-pop">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-sm hover:bg-sunken"
          >
            <Settings className="h-4 w-4" /> Cài đặt
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-bad hover:bg-bad-soft"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, fn: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  });
}

function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/contents?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm kiếm nội dung..."
        aria-label="Tìm kiếm nội dung"
        className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </form>
  );
}

export function AppShell({ footer }: { footer?: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);

  const crumb = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'Tổng quan';

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <Logo />
          <span className="text-lg font-bold tracking-tight">Content Manager</span>
        </div>
        <div className="flex-1 overflow-y-auto pt-2">
          <SidebarNav />
        </div>
        <StorageMeter />
        {footer}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <aside
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface pt-[env(safe-area-inset-top)] shadow-pop"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <Logo />
                <span className="text-lg font-bold">Content Manager</span>
              </div>
              <IconButton label="Đóng menu" onClick={() => setDrawer(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto pt-2">
              <SidebarNav onNavigate={() => setDrawer(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 pt-[env(safe-area-inset-top)] md:px-6">
          <IconButton label="Mở menu" className="lg:hidden" onClick={() => setDrawer(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <button
            type="button"
            aria-label="Tổng quan"
            onClick={() => navigate('/')}
            className="hidden cursor-pointer text-ink-3 hover:text-ink sm:block"
          >
            <Home className="h-5 w-5" />
          </button>
          <span className="hidden text-ink-3 sm:inline">/</span>
          <span className="truncate text-sm font-medium text-ink-2">{crumb}</span>
          <div className="flex flex-1 justify-center px-2">
            <SearchBox />
          </div>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/contents/new')}
            className="hidden sm:inline-flex"
          >
            Tạo nội dung
          </Button>
          <NotificationBell />
          <UserMenu />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 md:px-6 md:py-6 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom tabs */}
        <nav
          aria-label="Điều hướng nhanh"
          className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {BOTTOM.slice(0, 2).map((n) => (
            <TabLink key={n.to} {...n} />
          ))}
          <button
            type="button"
            aria-label="Tạo nội dung"
            onClick={() => navigate('/contents/new')}
            className="flex flex-1 cursor-pointer items-center justify-center"
          >
            <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-pop">
              <Plus className="h-6 w-6" />
            </span>
          </button>
          {BOTTOM.slice(2).map((n) => (
            <TabLink key={n.to} {...n} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function TabLink({ to, label, icon: Icon, end }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium',
          isActive ? 'text-brand' : 'text-ink-3',
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
