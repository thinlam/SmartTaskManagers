import { Mic, AlignLeft, FileText, Folder, Settings } from 'lucide-react';
import type { Page } from '../types';

const NAV_ITEMS: { page: Page; label: string; icon: typeof Mic }[] = [
  { page: 'new', label: 'Ghi âm mới', icon: Mic },
  { page: 'library', label: 'Thư viện', icon: AlignLeft },
  { page: 'detail', label: 'Bản ghi gần đây', icon: FileText },
  { page: 'folders', label: 'Thư mục', icon: Folder },
  { page: 'settings', label: 'Cài đặt', icon: Settings },
];

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
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
          const active = page === itemPage;
          return (
            <button
              key={itemPage}
              onClick={() => onNavigate(itemPage)}
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

      <div className="rounded-2xl bg-white/5 p-4">
        <p className="text-xs text-white/50">Thời lượng còn lại</p>
        <p className="mt-1 text-2xl font-bold">412 phút</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[65%] rounded-full bg-indigo-500" />
        </div>
        <button className="mt-4 w-full rounded-lg bg-white/10 py-2 text-sm font-medium hover:bg-white/15">
          Nâng cấp gói
        </button>
      </div>
    </aside>
  );
}
