import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  FileDown,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  countWords,
  errorText,
  formatDateTime,
  formatDuration,
  progressPercent,
} from '../lib/format';
import { exportDocx, exportSrt, exportTxt } from '../lib/export';
import { TranscriptList } from '../components/TranscriptList';
import {
  Card,
  ConfirmDialog,
  ErrorNotice,
  ProgressBar,
  Spinner,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui';
import { useAsync, useToast } from '../state/AppState';
import type { LabeledSegment, Recording } from '../types';

const BAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-fuchsia-500',
  'bg-rose-500',
];

function baseNameOf(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'ban-ghi';
}

export function RecordingDetailPage({
  id,
  onBack,
  onChanged,
}: {
  id: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const recording = useAsync(() => api.recordings.get(id), [id]);
  const folders = useAsync(() => api.folders.list(), []);
  const [search, setSearch] = useState('');
  const [mergeBySpeaker, setMergeBySpeaker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rec = recording.data;
  const processing = rec?.status === 'processing';

  // While the server transcribes in the background, poll for progress until it settles.
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => {
      api.recordings
        .get(id)
        .then((fresh) => {
          recording.setData(fresh);
          if (fresh.status !== 'processing') onChanged();
        })
        .catch(() => undefined); // transient network errors: keep polling
    }, 2500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processing, id]);

  const speakerOrder = useMemo(() => {
    const seen: string[] = [];
    for (const seg of rec?.segments ?? []) if (!seen.includes(seg.speaker)) seen.push(seg.speaker);
    return seen;
  }, [rec]);

  const speakerStats = useMemo(() => {
    if (!rec) return [];
    const totals = new Map<string, number>();
    for (const seg of rec.segments) {
      totals.set(seg.speaker, (totals.get(seg.speaker) ?? 0) + Math.max(0, seg.end - seg.start));
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return speakerOrder.map((raw, i) => ({
      raw,
      name: rec.speakerNames[raw] ?? raw,
      seconds: totals.get(raw) ?? 0,
      percent: Math.round(((totals.get(raw) ?? 0) / sum) * 100),
      color: BAR_COLORS[i % BAR_COLORS.length]!,
    }));
  }, [rec, speakerOrder]);

  if (recording.loading && !rec)
    return (
      <div className="flex-1">
        <Spinner />
      </div>
    );
  if (!rec) {
    return (
      <div className="flex-1 p-8">
        <button
          onClick={onBack}
          className="mb-4 text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Thư viện
        </button>
        <ErrorNotice
          message={recording.error ?? 'Không tìm thấy bản ghi.'}
          onRetry={recording.reload}
        />
      </div>
    );
  }

  async function save(patch: Parameters<typeof api.recordings.update>[1], success?: string) {
    try {
      const updated = await api.recordings.update(id, patch);
      recording.setData(updated);
      onChanged();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  function namedSegments(r: Recording): LabeledSegment[] {
    return r.segments.map((s) => ({ ...s, speaker: r.speakerNames[s.speaker] ?? s.speaker }));
  }

  async function copyText(r: Recording) {
    const text = namedSegments(r)
      .map((s) => `${s.speaker}: ${s.text.trim()}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép bản ghi.');
    } catch {
      toast.error('Không sao chép được. Hãy thử xuất file.');
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.recordings.remove(id);
      toast.success('Đã xóa bản ghi.');
      onChanged();
      onBack();
    } catch (err) {
      toast.error(errorText(err));
      setDeleting(false);
    }
  }

  function commitTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== rec!.title) void save({ title: next });
  }

  function addNote() {
    const text = noteDraft.trim();
    if (!text) return;
    setNoteDraft('');
    void save({
      notes: [
        ...rec!.notes,
        { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
      ],
    });
  }

  const base = baseNameOf(rec.title);
  const multiSpeaker = speakerOrder.length > 1;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Thư viện
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex max-w-2xl items-center gap-2">
              <input
                autoFocus
                className={`${inputClass} text-xl font-bold`}
                value={titleDraft}
                maxLength={200}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
              <button
                onClick={commitTitle}
                aria-label="Lưu tiêu đề"
                className="rounded p-2 text-emerald-600 hover:bg-emerald-50"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                aria-label="Hủy"
                className="rounded p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-slate-900">{rec.title}</h1>
              <button
                onClick={() => {
                  setTitleDraft(rec.title);
                  setEditingTitle(true);
                }}
                aria-label="Đổi tiêu đề"
                title="Đổi tiêu đề"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-slate-400">
            {rec.status === 'done'
              ? `${formatDateTime(rec.createdAt)} · ${formatDuration(rec.durationSec)} · ${speakerOrder.length || 1} người nói · ${countWords(rec.text)} từ`
              : `${formatDateTime(rec.createdAt)} · ${rec.fileName}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {rec.status === 'done' && (
            <>
              <button onClick={() => void copyText(rec)} className={secondaryButtonClass}>
                <Copy className="h-3.5 w-3.5" /> Sao chép
              </button>
              <button
                onClick={() => exportTxt(namedSegments(rec), base)}
                className={secondaryButtonClass}
              >
                .txt
              </button>
              <button
                onClick={() => exportSrt(namedSegments(rec), base)}
                className={secondaryButtonClass}
              >
                .srt
              </button>
              <button
                onClick={() => void exportDocx(namedSegments(rec), base)}
                className={primaryButtonClass}
              >
                <FileDown className="h-3.5 w-3.5" /> .docx
              </button>
            </>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Xóa bản ghi"
            title="Xóa bản ghi"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {rec.status === 'processing' && (
        <Card className="mx-auto max-w-xl py-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Đang chuyển thành văn bản...
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {rec.progressTotal > 0
              ? `Đã xử lý ${rec.progressDone}/${rec.progressTotal} đoạn (${progressPercent(rec.progressDone, rec.progressTotal)}%)`
              : 'Đang chuẩn bị file âm thanh...'}
          </p>
          <ProgressBar
            percent={progressPercent(rec.progressDone, rec.progressTotal)}
            className="mx-auto mt-4 max-w-sm"
          />
          <p className="mt-4 text-xs text-slate-400">
            Quá trình chạy nền trên máy chủ. Bạn có thể rời trang này, bản ghi sẽ hiện trong Thư
            viện khi xong.
          </p>
        </Card>
      )}

      {rec.status === 'failed' && (
        <Card className="mx-auto max-w-xl py-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Không xử lý được file này</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {rec.error ?? 'Đã xảy ra lỗi không xác định.'}
          </p>
          <p className="mt-4 text-xs text-slate-400">Hãy xóa bản ghi này và tải file lên lại.</p>
        </Card>
      )}

      {rec.status === 'done' && rec.diarizationError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Không nhận dạng được người nói ({rec.diarizationError}). Toàn bộ nội dung được gán cho
          "Người nói 1".
        </div>
      )}

      {rec.status === 'done' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trong bản ghi..."
                  className={`${inputClass} bg-slate-50 py-2 pl-9`}
                />
              </div>
              {multiSpeaker && (
                <button
                  onClick={() => setMergeBySpeaker((v) => !v)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    mergeBySpeaker
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Gộp theo người nói
                </button>
              )}
            </div>

            {rec.segments.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Bản ghi không có nội dung nhận dạng được.
              </p>
            ) : (
              <TranscriptList
                segments={rec.segments}
                speakerOrder={speakerOrder}
                speakerNames={rec.speakerNames}
                onRenameSpeaker={(raw, name) =>
                  void save({ speakerNames: { ...rec.speakerNames, [raw]: name } })
                }
                searchQuery={search}
                mergeBySpeaker={mergeBySpeaker}
              />
            )}
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Thông tin</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">File gốc</dt>
                  <dd className="truncate text-right text-slate-800" title={rec.fileName}>
                    {rec.fileName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Xử lý trong</dt>
                  <dd className="text-slate-800">{(rec.processingTimeMs / 1000).toFixed(1)}s</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Thư mục</dt>
                  <dd>
                    <select
                      className="max-w-[160px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                      value={rec.folderId ?? ''}
                      onChange={(e) =>
                        void save({ folderId: e.target.value || null }, 'Đã chuyển thư mục.')
                      }
                      aria-label="Thư mục"
                    >
                      <option value="">Chưa phân loại</option>
                      {folders.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
              </dl>
            </Card>

            {multiSpeaker && (
              <Card className="p-5">
                <h3 className="mb-3 font-semibold text-slate-900">Thời gian nói</h3>
                <div className="space-y-3">
                  {speakerStats.map((s) => (
                    <div key={s.raw}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="truncate font-medium text-slate-700">{s.name}</span>
                        <span className="shrink-0 text-slate-400">
                          {formatDuration(s.seconds)} · {s.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${s.color}`} style={{ width: `${s.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Bấm vào tên người nói trong bản ghi để đổi tên.
                </p>
              </Card>
            )}

            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Ghi chú</h3>
              {rec.notes.length === 0 ? (
                <p className="mb-3 text-sm text-slate-400">Chưa có ghi chú.</p>
              ) : (
                <div className="mb-3 flex flex-col gap-2">
                  {rec.notes.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                        {n.text}
                        <span className="mt-0.5 block text-xs text-amber-600">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </p>
                      <button
                        onClick={() => void save({ notes: rec.notes.filter((x) => x.id !== n.id) })}
                        aria-label="Xóa ghi chú"
                        className="rounded p-1 text-amber-500 opacity-60 hover:bg-amber-100 hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={noteDraft}
                  maxLength={2000}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Thêm ghi chú..."
                  className={inputClass}
                />
                <button
                  onClick={addNote}
                  disabled={!noteDraft.trim()}
                  className={primaryButtonClass}
                >
                  Thêm
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Xóa bản ghi?"
          message={`"${rec.title}" sẽ bị xóa vĩnh viễn, không thể khôi phục.`}
          confirmLabel="Xóa"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
