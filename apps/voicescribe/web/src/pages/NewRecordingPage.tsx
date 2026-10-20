import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, Copy, Search, Loader2, AlertCircle, X } from 'lucide-react';
import { transcribeFile } from '../lib/api';
import { exportDocx, exportSrt, exportTxt } from '../lib/export';
import { UploadZone } from '../components/UploadZone';
import { TranscriptList } from '../components/TranscriptList';
import type { TranscriptionState } from '../types';

function baseNameOf(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'ban-ghi';
}

interface Note {
  text: string;
  addedAt: string;
}

export function NewRecordingPage() {
  const [state, setState] = useState<TranscriptionState>({ kind: 'idle' });
  const [numSpeakers, setNumSpeakers] = useState<string>('');
  const [search, setSearch] = useState('');
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [splitSpeakers, setSplitSpeakers] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const speakerOrder = useMemo(() => {
    if (state.kind !== 'done') return [];
    const seen: string[] = [];
    for (const seg of state.result.segments) {
      if (!seen.includes(seg.speaker)) seen.push(seg.speaker);
    }
    return seen;
  }, [state]);

  useEffect(() => {
    if (autoScroll) transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state, notes, autoScroll]);

  function handleFileSelected(file: File) {
    setSpeakerNames({});
    setSearch('');
    setNotes([]);
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'uploading', percent: 0, fileName: file.name });

    const parsedNumSpeakers = numSpeakers.trim() ? Number.parseInt(numSpeakers, 10) : undefined;

    transcribeFile(
      file,
      parsedNumSpeakers,
      (percent) => {
        setState((prev) => (prev.kind === 'uploading' ? { ...prev, percent } : prev));
        if (percent >= 100) setState({ kind: 'processing', fileName: file.name });
      },
      controller.signal,
    )
      .then((result) => setState({ kind: 'done', fileName: file.name, result }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState({ kind: 'idle' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.',
        });
      });
  }

  function handleRenameSpeaker(rawSpeaker: string, newName: string) {
    setSpeakerNames((prev) => ({ ...prev, [rawSpeaker]: newName }));
  }

  function currentSegmentsWithNames() {
    if (state.kind !== 'done') return [];
    return state.result.segments.map((seg) => ({
      ...seg,
      speaker: speakerNames[seg.speaker] ?? seg.speaker,
    }));
  }

  function handleCopy() {
    if (state.kind !== 'done') return;
    const text = currentSegmentsWithNames()
      .map((seg) => `${seg.speaker}: ${seg.text.trim()}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }

  function addNote() {
    const text = noteDraft.trim();
    if (!text) return;
    setNotes((prev) => [...prev, { text, addedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    setNoteDraft('');
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ghi âm mới</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tải lên file âm thanh — VoiceScribe chuyển thành văn bản và tách người nói.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Tiếng Việt
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Độ chính xác cao
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: recorder / upload card */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          {state.kind === 'idle' && (
            <>
              <UploadZone onFileSelected={handleFileSelected} />
              <label className="mt-4 block text-xs font-medium text-slate-500">Số người nói (tùy chọn)</label>
              <input
                type="number"
                min={1}
                value={numSpeakers}
                onChange={(e) => setNumSpeakers(e.target.value)}
                placeholder="Tự động"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                Nhập đúng số người nói giúp tăng độ chính xác phân biệt giọng.
              </p>
            </>
          )}

          {(state.kind === 'uploading' || state.kind === 'processing') && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="font-medium text-slate-900">
                {state.kind === 'uploading'
                  ? `Đang tải lên "${state.fileName}"...`
                  : `Đang nhận dạng giọng nói trong "${state.fileName}"...`}
              </p>
              {state.kind === 'uploading' ? (
                <div className="h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-indigo-600 transition-[width]"
                    style={{ width: `${state.percent}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Có thể mất vài phút với file dài, đặc biệt nếu bật nhận dạng người nói.
                </p>
              )}
              <button
                onClick={() => {
                  abortRef.current?.abort();
                }}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                <X className="h-3 w-3" /> Hủy
              </button>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <p className="font-medium text-slate-900">Không xử lý được file âm thanh</p>
              <p className="max-w-md text-sm text-slate-500">{state.message}</p>
              <button
                onClick={() => setState({ kind: 'idle' })}
                className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Thử lại
              </button>
            </div>
          )}

          {state.kind === 'done' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{state.fileName}</p>
                  <p className="text-xs text-slate-400">
                    {state.result.segments.length} đoạn · {(state.result.processingTimeMs / 1000).toFixed(1)}s xử lý
                    {state.result.diarizationError && (
                      <span className="ml-2 text-amber-600">
                        · Nhận dạng người nói thất bại, gán chung "Người nói 1"
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setState({ kind: 'idle' })}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ghi âm khác
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Sao chép
                </button>
                <button
                  onClick={() => exportTxt(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  .txt
                </button>
                <button
                  onClick={() => exportSrt(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  .srt
                </button>
                <button
                  onClick={() => exportDocx(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <FileDown className="h-3.5 w-3.5" /> .docx
                </button>
              </div>

              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trong bản ghi"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </>
          )}
        </div>

        {/* Right: live transcript card */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Bản ghi trực tiếp</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSplitSpeakers((v) => !v)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  splitSpeakers
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                }`}
              >
                Tách người nói
              </button>
              <button
                onClick={() => setAutoScroll((v) => !v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  autoScroll ? 'bg-indigo-50 text-indigo-700' : 'border border-slate-200 text-slate-500'
                }`}
              >
                Tự cuộn: {autoScroll ? 'Bật' : 'Tắt'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {state.kind !== 'done' ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Bản ghi sẽ xuất hiện ở đây sau khi xử lý xong.
              </p>
            ) : (
              <TranscriptList
                segments={state.result.segments}
                speakerOrder={speakerOrder}
                speakerNames={speakerNames}
                onRenameSpeaker={handleRenameSpeaker}
                searchQuery={search}
                mergeBySpeaker={!splitSpeakers}
              />
            )}

            {notes.length > 0 && (
              <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4">
                {notes.map((note, i) => (
                  <p key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-sm italic text-amber-800">
                    <span className="mr-2 font-mono text-xs not-italic text-amber-500">{note.addedAt}</span>
                    {note.text}
                  </p>
                ))}
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              placeholder="Thêm ghi chú tại thời điểm này..."
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={addNote}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
