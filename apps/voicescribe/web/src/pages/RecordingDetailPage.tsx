import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Loader2,
  Pencil,
  Search,
  Subtitles,
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
import {
  exportDocx,
  exportSrt,
  exportTxt,
  SaveCancelled,
  toPlainText,
  type ExportDoc,
  type ViewMode,
} from '../lib/export';
import {
  buildBlocks,
  displayName,
  paragraphOf,
  speakerOrderOf,
} from '../lib/transcript';
import {
  ParagraphTranscript,
  SpeakerTranscript,
  colorOf,
  type SegmentsChange,
} from '../components/TranscriptView';
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

const MODE_KEY = 'voicescribe.viewMode';

function loadMode(): ViewMode | null {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return stored === 'paragraph' || stored === 'speakers' ? stored : null;
  } catch {
    return null;
  }
}

function baseNameOf(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'ban-ghi';
}

function ModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: { value: ViewMode; label: string }[] = [
    { value: 'paragraph', label: 'Đoạn văn' },
    { value: 'speakers', label: 'Phân người nói' },
  ];
  return (
    <div role="tablist" aria-label="Chế độ hiển thị" className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === o.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ExportMenu({ doc }: { doc: ExportDoc }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const items = [
    { label: 'Word (.docx)', hint: 'Văn bản định dạng sẵn', Icon: FileText, run: () => exportDocx(doc) },
    { label: 'Văn bản (.txt)', hint: 'Văn bản thuần', Icon: FileText, run: () => exportTxt(doc) },
    { label: 'Phụ đề (.srt)', hint: 'Có mốc thời gian', Icon: Subtitles, run: () => exportSrt(doc) },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen((v) => !v)} className={primaryButtonClass} aria-expanded={open}>
        <Download className="h-3.5 w-3.5" /> Xuất file <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {items.map(({ label, hint, Icon, run }) => (
            <button
              key={label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                run()
                  .then((message) => toast.success(message))
                  .catch((err: unknown) => {
                    if (err instanceof SaveCancelled) return;
                    toast.error(`Không lưu được file: ${errorText(err)}`);
                  });
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-slate-400" />
              <span>
                <span className="block text-sm font-medium text-slate-800">{label}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
          <p className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2 text-xs text-slate-400">
            Nội dung xuất theo chế độ đang xem:{' '}
            <strong className="font-medium text-slate-500">
              {doc.mode === 'paragraph' ? 'Đoạn văn' : 'Phân người nói'}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
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
  const [chosenMode, setChosenMode] = useState<ViewMode | null>(loadMode);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const speakerOrder = useMemo(() => speakerOrderOf(rec?.segments ?? []), [rec?.segments]);
  const multiSpeaker = speakerOrder.length > 1;
  const mode: ViewMode = chosenMode ?? (multiSpeaker ? 'speakers' : 'paragraph');

  const speakerStats = useMemo(() => {
    if (!rec) return [];
    const totals = new Map<string, number>();
    for (const seg of rec.segments) {
      totals.set(seg.speaker, (totals.get(seg.speaker) ?? 0) + Math.max(0, seg.end - seg.start));
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return speakerOrder.map((raw, i) => ({
      raw,
      name: displayName(rec.speakerNames, raw),
      seconds: totals.get(raw) ?? 0,
      percent: Math.round(((totals.get(raw) ?? 0) / sum) * 100),
      color: colorOf(i).dot,
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
    setSaving(true);
    try {
      const updated = await api.recordings.update(id, patch);
      recording.setData(updated);
      onChanged();
      if (success) toast.success(success);
      return true;
    } catch (err) {
      toast.error(errorText(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function chooseMode(next: ViewMode) {
    setChosenMode(next);
    setEditing(false);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* preference just won't persist */
    }
  }

  function exportDoc(r: NonNullable<typeof rec>): ExportDoc {
    const named = (raw: string) => displayName(r.speakerNames, raw);
    const segments = r.segments.map((s) => ({ ...s, speaker: named(s.speaker) }));
    return {
      mode,
      title: r.title,
      fileBase: baseNameOf(r.title),
      paragraph: paragraphOf(r),
      blocks: buildBlocks(segments, speakerOrder.length > 1),
      segments,
    };
  }

  async function copyText(r: NonNullable<typeof rec>) {
    try {
      await navigator.clipboard.writeText(toPlainText(exportDoc(r)));
      toast.success('Đã sao chép.');
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

  function changeSegments(change: SegmentsChange) {
    void save({
      segments: change.segments,
      ...(change.speakerNames ? { speakerNames: change.speakerNames } : {}),
    });
  }

  const paragraph = paragraphOf(rec);
  const done = rec.status === 'done';

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
            {done
              ? `${formatDateTime(rec.createdAt)} · ${formatDuration(rec.durationSec)} · ${speakerOrder.length || 1} người nói · ${countWords(paragraph)} từ`
              : `${formatDateTime(rec.createdAt)} · ${rec.fileName}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {done && (
            <>
              <button onClick={() => void copyText(rec)} className={secondaryButtonClass}>
                <Copy className="h-3.5 w-3.5" /> Sao chép
              </button>
              <ExportMenu doc={exportDoc(rec)} />
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

      {done && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <Card className="min-w-0 p-0">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
              <ModeSwitch mode={mode} onChange={chooseMode} />
              <div className="relative ml-auto min-w-[180px] max-w-xs flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trong bản ghi..."
                  className={`${inputClass} bg-slate-50 py-2 pl-9`}
                />
              </div>
              {(mode === 'speakers' || !editing) && (
                <button
                  onClick={() => setEditing((v) => !v)}
                  className={editing ? primaryButtonClass : secondaryButtonClass}
                >
                  {editing ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Xong
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                    </>
                  )}
                </button>
              )}
              {saving && (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
                </span>
              )}
            </div>

            <div className="p-5">
              {rec.diarizationError && mode === 'speakers' && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Không nhận dạng được người nói ({rec.diarizationError}). Toàn bộ nội dung được
                  gán cho một người nói; bạn có thể tự gán lại ở chế độ Chỉnh sửa.
                </div>
              )}

              {rec.segments.length === 0 && !paragraph ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Bản ghi không có nội dung nhận dạng được.
                </p>
              ) : mode === 'paragraph' ? (
                <ParagraphTranscript
                  text={paragraph}
                  editing={editing}
                  query={search}
                  onCancel={() => setEditing(false)}
                  onSave={async (text) => {
                    if (await save({ text }, 'Đã lưu văn bản.')) setEditing(false);
                  }}
                />
              ) : (
                <SpeakerTranscript
                  segments={rec.segments}
                  speakerOrder={speakerOrder}
                  speakerNames={rec.speakerNames}
                  editing={editing}
                  query={search}
                  onChange={changeSegments}
                  onRenameSpeaker={(raw, name) =>
                    void save({ speakerNames: { ...rec.speakerNames, [raw]: name } })
                  }
                />
              )}
            </div>
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
