import { useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { SAMPLE_RECORDINGS, type SampleRecording } from '../lib/sampleRecordings';

const FILTERS = ['Tất cả', 'Cuộc họp', 'Phỏng vấn', 'Ghi chú cá nhân'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLES: Record<SampleRecording['status'], string> = {
  'Hoàn tất': 'bg-emerald-100 text-emerald-700',
  'Đang xử lý': 'bg-amber-100 text-amber-700',
};

export function LibraryPage({
  onOpenRecording,
  onNewRecording,
}: {
  onOpenRecording: (id: string) => void;
  onNewRecording: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('Tất cả');
  const [query, setQuery] = useState('');

  const rows = SAMPLE_RECORDINGS.filter((r) => {
    if (filter !== 'Tất cả' && r.category !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Thư viện</h1>
        <div className="flex shrink-0 gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Tải tệp lên
          </button>
          <button
            onClick={onNewRecording}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Ghi âm mới
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tiêu đề hoặc nội dung..."
          className="min-w-[280px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 font-semibold">Tiêu đề</th>
              <th className="px-6 py-3 font-semibold">Ngày</th>
              <th className="px-6 py-3 font-semibold">Thời lượng</th>
              <th className="px-6 py-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onOpenRecording(r.id)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">{r.title}</p>
                  <p className="mt-0.5 max-w-xl truncate text-slate-400">{r.preview}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{r.date}</td>
                <td className="px-6 py-4 font-mono text-slate-600">{r.duration}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                  Không tìm thấy bản ghi nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
