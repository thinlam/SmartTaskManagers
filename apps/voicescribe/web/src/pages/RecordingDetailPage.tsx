import { useState } from 'react';
import { ArrowLeft, Play, Pause, Languages, Share2, FileDown, Search } from 'lucide-react';
import { SAMPLE_RECORDINGS } from '../lib/sampleRecordings';

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500'];

export function RecordingDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const recording = SAMPLE_RECORDINGS.find((r) => r.id === id) ?? SAMPLE_RECORDINGS[0]!;
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const speakerOrder = [...new Set(recording.segments.map((s) => s.speaker))];
  const filtered = search.trim()
    ? recording.segments.filter((s) => s.text.toLowerCase().includes(search.trim().toLowerCase()))
    : recording.segments;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Thư viện
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{recording.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {recording.date} · {recording.duration} · {recording.speakerCount} người nói · Tiếng Việt
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Languages className="mr-1.5 inline h-3.5 w-3.5" /> Dịch
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Share2 className="mr-1.5 inline h-3.5 w-3.5" /> Chia sẻ
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            <FileDown className="h-3.5 w-3.5" /> Xuất file
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <span className="shrink-0 font-mono text-sm text-slate-500">00:00 / {recording.duration}</span>
        <div className="flex h-8 flex-1 items-end gap-[3px]">
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${i < 14 ? 'bg-indigo-500' : 'bg-slate-200'}`}
              style={{ height: `${8 + ((i * 37) % 24)}px` }}
            />
          ))}
        </div>
        <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500">
          1.0×
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong bản ghi..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Đổi tên người nói
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {recording.segments.length === 0 ? 'Bản ghi đang được xử lý.' : 'Không tìm thấy đoạn nào khớp.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((seg, i) => {
                const colorIndex = speakerOrder.indexOf(seg.speaker) % AVATAR_COLORS.length;
                const highlighted = search.trim() && seg.text.toLowerCase().includes(search.trim().toLowerCase());
                return (
                  <div
                    key={i}
                    className={`flex gap-4 rounded-xl px-3 py-3 ${highlighted ? 'bg-indigo-50' : ''}`}
                  >
                    <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-slate-400">{seg.start}</span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`mb-1 text-sm font-semibold ${
                          colorIndex === 0 ? 'text-indigo-600' : colorIndex === 1 ? 'text-emerald-600' : 'text-slate-700'
                        }`}
                      >
                        {seg.speaker}
                      </p>
                      <p className="leading-relaxed text-slate-700">{seg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-2 font-semibold text-slate-900">Tóm tắt</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {recording.summary || 'Chưa có tóm tắt — bản ghi đang được xử lý.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Việc cần làm</h3>
            {recording.todos.length === 0 ? (
              <p className="text-sm text-slate-400">Không có việc cần làm.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recording.todos.map((todo, i) => (
                  <label key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!checked[i]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className={checked[i] ? 'text-slate-400 line-through' : ''}>{todo}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Từ khoá</h3>
            {recording.keywords.length === 0 ? (
              <p className="text-sm text-slate-400">Không có từ khoá.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recording.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
