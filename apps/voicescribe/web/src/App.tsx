import { useMemo, useRef, useState } from 'react';
import { Mic, FileDown, Copy, Search, Loader2, AlertCircle } from 'lucide-react';
import { transcribeFile } from './lib/api';
import { exportDocx, exportSrt, exportTxt } from './lib/export';
import { UploadZone } from './components/UploadZone';
import { TranscriptList } from './components/TranscriptList';
import type { TranscriptionState } from './types';

function baseNameOf(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'ban-ghi';
}

export function App() {
  const [state, setState] = useState<TranscriptionState>({ kind: 'idle' });
  const [numSpeakers, setNumSpeakers] = useState<string>('');
  const [search, setSearch] = useState('');
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const speakerOrder = useMemo(() => {
    if (state.kind !== 'done') return [];
    const seen: string[] = [];
    for (const seg of state.result.segments) {
      if (!seen.includes(seg.speaker)) seen.push(seg.speaker);
    }
    return seen;
  }, [state]);

  function handleFileSelected(file: File) {
    setSpeakerNames({});
    setSearch('');
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'uploading', percent: 0, fileName: file.name });

    const parsedNumSpeakers = numSpeakers.trim() ? Number.parseInt(numSpeakers, 10) : undefined;

    transcribeFile(
      file,
      parsedNumSpeakers,
      (percent) => {
        setState((prev) =>
          prev.kind === 'uploading' ? { ...prev, percent } : prev,
        );
        if (percent >= 100) {
          setState({ kind: 'processing', fileName: file.name });
        }
      },
      controller.signal,
    )
      .then((result) => {
        setState({ kind: 'done', fileName: file.name, result });
      })
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

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#13151a] p-4">
        <div className="mb-6 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Mic className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">VoiceScribe</p>
            <p className="text-xs text-white/40">Giọng nói → Văn bản</p>
          </div>
        </div>

        <UploadButton onFileSelected={handleFileSelected} />

        <div className="mt-6 flex-1 text-sm text-white/40">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-white/30">
            Tùy chọn
          </p>
          <label className="mt-3 block px-2 text-xs text-white/50">Số người nói (tùy chọn)</label>
          <input
            type="number"
            min={1}
            value={numSpeakers}
            onChange={(e) => setNumSpeakers(e.target.value)}
            placeholder="Tự động"
            className="mx-2 mt-1 w-[calc(100%-1rem)] rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400"
          />
          <p className="mt-1 px-2 text-xs text-white/30">
            Nhập đúng số người nói giúp tăng độ chính xác phân biệt giọng.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {state.kind === 'done' && (
          <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{state.fileName}</h1>
              <p className="text-xs text-white/40">
                {state.result.segments.length} đoạn ·{' '}
                {(state.result.processingTimeMs / 1000).toFixed(1)}s xử lý
                {state.result.diarizationError && (
                  <span className="ml-2 text-amber-400">
                    · Nhận dạng người nói thất bại, gán chung "Người nói 1"
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trong bản ghi"
                  className="w-48 rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
              >
                <Copy className="h-3.5 w-3.5" /> Sao chép
              </button>
              <button
                onClick={() => exportTxt(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
              >
                .txt
              </button>
              <button
                onClick={() => exportSrt(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
              >
                .srt
              </button>
              <button
                onClick={() => exportDocx(currentSegmentsWithNames(), baseNameOf(state.fileName))}
                className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400"
              >
                <FileDown className="h-3.5 w-3.5" /> .docx
              </button>
            </div>
          </header>
        )}

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          {state.kind === 'idle' && <UploadZone onFileSelected={handleFileSelected} />}

          {state.kind === 'uploading' && (
            <StatusPanel
              title={`Đang tải lên "${state.fileName}"...`}
              subtitle={`${state.percent}%`}
              progressPercent={state.percent}
            />
          )}

          {state.kind === 'processing' && (
            <StatusPanel
              title={`Đang nhận dạng giọng nói trong "${state.fileName}"...`}
              subtitle="Có thể mất vài phút với file dài, đặc biệt nếu bật nhận dạng người nói."
              indeterminate
            />
          )}

          {state.kind === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-rose-400" />
              <p className="font-medium text-white">Không xử lý được file âm thanh</p>
              <p className="max-w-md text-sm text-white/50">{state.message}</p>
              <button
                onClick={() => setState({ kind: 'idle' })}
                className="mt-2 rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              >
                Thử lại
              </button>
            </div>
          )}

          {state.kind === 'done' && (
            <div className="-m-6 rounded-lg">
              <TranscriptList
                segments={state.result.segments}
                speakerOrder={speakerOrder}
                speakerNames={speakerNames}
                onRenameSpeaker={handleRenameSpeaker}
                searchQuery={search}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function UploadButton({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400"
      >
        + Bản ghi mới
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.m4a,.wav,.mp4,.webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = '';
        }}
      />
    </>
  );
}

function StatusPanel({
  title,
  subtitle,
  progressPercent,
  indeterminate,
}: {
  title: string;
  subtitle: string;
  progressPercent?: number;
  indeterminate?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      <p className="font-medium text-white">{title}</p>
      {!indeterminate && progressPercent !== undefined && (
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      <p className="text-xs text-white/40">{subtitle}</p>
    </div>
  );
}
