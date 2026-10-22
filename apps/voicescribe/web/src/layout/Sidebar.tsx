import { AlignLeft, Folder, LogOut, Mic, Settings } from 'lucide-react';
import { api } from '../lib/api';
import { formatTotalDuration } from '../lib/format';
import { useAsync, useAuth } from '../state/AppState';
import type { PageName } from '../types';

const NAV_ITEMS: { page: PageName; label: string; icon: typeof Mic }[] = [
  { page: 'new', label: 'Ghi âm mới', icon: Mic },
  { page: 'library', label: 'Thư viện', icon: AlignLeft },
  { page: 'folders', label: 'Thư mục', icon: Folder },
  { page: 'settings', label: 'Cài đặt', icon: Settings },
];

export function Sidebar({
  page,
  onNavigate,
  refreshKey,
}: {
  page: PageName;
  onNavigate: (page: PageName) => void;
  /** Bumped by the app after recordings change so the usage card stays current. */
  refreshKey: number;
}) {
  const { user, signOut } = useAuth();
  const stats = useAsync(() => api.recordings.stats(), [refreshKey]);
  // The detail view belongs to the library section.
  const activePage = page === 'detail' ? 'library' : page;

  return (
    <aside className="flex w-72 shrink-0 flex-col bg-[#0f1115] p-4 text-white">
      <div className="mb-6 flex items-center gap-3 px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
          <Mic className="h-5 w-5" />
        </span>
        <p className="text-lg font-semibold">VoiceScribe</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ page: itemPage, label, icon: Icon }) => {
          const active = activePage === itemPage;
          return (
            <button
              key={itemPage}
              onClick={() => onNavigate(itemPage)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {stats.data && (
        <div className="mb-3 rounded-2xl bg-white/5 p-4">
          <p className="text-xs text-white/50">Đã chuyển thành văn bản</p>
          <p className="mt-1 text-2xl font-bold">{formatTotalDuration(stats.data.totalDurationSec)}</p>
          <p className="mt-1 text-xs text-white/50">{stats.data.count} bản ghi</p>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold">
          {(user?.fullName ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate text-xs text-white/50">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
