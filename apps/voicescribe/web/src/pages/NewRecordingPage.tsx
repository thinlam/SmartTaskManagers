import { useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Loader2, Mic, Upload, X } from 'lucide-react';
import { api, transcribeFile } from '../lib/api';
import type { DenoiseLevel } from '../types';
import { errorText } from '../lib/format';
import { isRecordingSupported, RecorderPanel } from '../components/RecorderPanel';
import { UploadZone } from '../components/UploadZone';
import {
  Card,
  Field,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui';
import { useAsync, useAuth, useToast } from '../state/AppState';

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; percent: number; fileName: string }
  | { kind: 'processing'; fileName: string }
  | { kind: 'error'; message: string };

export function NewRecordingPage({ onSaved }: { onSaved: (id: string) => void }) {
  const { config } = useAuth();
  const toast = useToast();
  const folders = useAsync(() => api.folders.list(), []);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [numSpeakers, setNumSpeakers] = useState('');
  const [denoiseOn, setDenoiseOn] = useState(true);
  const [denoiseLevel, setDenoiseLevel] = useState<Exclude<DenoiseLevel, 'off'>>('medium');
  const [mode, setMode] = useState<'record' | 'file'>(() =>
    isRecordingSupported() ? 'record' : 'file',
  );
  const abortRef = useRef<AbortController | null>(null);
  // Kept so a failed upload of a fresh recording can be retried without recording again.
  const lastFileRef = useRef<File | null>(null);

  const maxUploadMb = config?.maxUploadMb ?? 100;

  function handleFileSelected(file: File) {
    lastFileRef.current = file;
    if (file.size > maxUploadMb * 1024 * 1024) {
      setState({ kind: 'error', message: `File vượt quá dung lượng tối đa ${maxUploadMb}MB.` });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'uploading', percent: 0, fileName: file.name });

    transcribeFile(
      file,
      {
        title: title.trim() || undefined,
        folderId: folderId || undefined,
        numSpeakers: numSpeakers.trim() ? Number.parseInt(numSpeakers, 10) : undefined,
        denoise: denoiseOn ? denoiseLevel : 'off',
      },
      (percent) => {
        setState((prev) => {
          if (prev.kind !== 'uploading') return prev;
          return percent >= 100
            ? { kind: 'processing', fileName: file.name }
            : { ...prev, percent };
        });
      },
      controller.signal,
    )
      .then((recording) => {
        toast.success('Đã tải lên. VoiceScribe đang xử lý nền, bạn có thể làm việc khác.');
        onSaved(recording.id);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState({ kind: 'idle' });
          return;
        }
        setState({ kind: 'error', message: errorText(err) });
      });
  }

  const busy = state.kind === 'uploading' || state.kind === 'processing';

  const optionsSet = Boolean(
    title.trim() || folderId || numSpeakers.trim() || !denoiseOn || denoiseLevel !== 'medium',
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">Ghi âm mới</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ghi âm trực tiếp hoặc chọn file, VoiceScribe sẽ tự chuyển thành văn bản.
        </p>

        {state.kind === 'idle' && (
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
            {(
              [
                ['record', 'Ghi âm', Mic],
                ['file', 'Chọn file', Upload],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        <Card className="mt-6 flex min-h-[320px] flex-col">
          {state.kind === 'idle' && mode === 'record' && (
            <RecorderPanel maxBytes={maxUploadMb * 1024 * 1024} onRecorded={handleFileSelected} />
          )}
          {state.kind === 'idle' && mode === 'file' && (
            <UploadZone onFileSelected={handleFileSelected} />
          )}

          {busy && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="font-medium text-slate-900">
                {state.kind === 'uploading'
                  ? `Đang tải lên "${state.fileName}"...`
                  : `Đang gửi "${state.fileName}" cho máy chủ...`}
              </p>
              {state.kind === 'uploading' ? (
                <div className="h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-indigo-600 transition-[width]"
                    style={{ width: `${state.percent}%` }}
                  />
                </div>
              ) : (
                <p className="max-w-sm text-xs text-slate-400">
                  Sắp xong bước tải lên. Việc nhận dạng sẽ chạy nền trên máy chủ.
                </p>
              )}
              <button
                onClick={() => abortRef.current?.abort()}
                className={`${secondaryButtonClass} text-xs`}
              >
                <X className="h-3 w-3" /> Hủy
              </button>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <p className="font-medium text-slate-900">Không xử lý được file âm thanh</p>
              <p className="max-w-md text-sm text-slate-500">{state.message}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {lastFileRef.current && (
                  <button
                    onClick={() => handleFileSelected(lastFileRef.current!)}
                    className={primaryButtonClass}
                  >
                    Gửi lại
                  </button>
                )}
                <button
                  onClick={() => setState({ kind: 'idle' })}
                  className={lastFileRef.current ? secondaryButtonClass : primaryButtonClass}
                >
                  Làm lại
                </button>
              </div>
            </div>
          )}
        </Card>

        <p className="mt-3 text-center text-xs text-slate-400">
          Ghi âm trực tiếp hoặc file mp3, m4a, wav, mp4, webm · tối đa {maxUploadMb}MB · file dài
          được xử lý nền, bạn có thể rời trang.
        </p>

        <details
          className="group mt-6 rounded-2xl border border-slate-200 bg-white"
          open={optionsSet}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-700">
            <span>
              Tùy chọn
              <span className="ml-2 font-normal text-slate-400">tiêu đề, thư mục</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2">
            <Field label="Tiêu đề" hint="Để trống sẽ lấy theo tên file.">
              <input
                className={inputClass}
                value={title}
                maxLength={200}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Họp kế hoạch quý"
              />
            </Field>
            <Field label="Lưu vào thư mục">
              <select
                className={inputClass}
                value={folderId}
                disabled={busy}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">Chưa phân loại</option>
                {folders.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            {config?.diarizationEnabled && (
              <Field
                label="Số người nói (tùy chọn)"
                hint="Nhập đúng số người giúp tách giọng chính xác hơn."
              >
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClass}
                  value={numSpeakers}
                  disabled={busy}
                  onChange={(e) => setNumSpeakers(e.target.value)}
                  placeholder="Tự động"
                />
              </Field>
            )}
            <Field
              label="Lọc tạp âm"
              hint="Giảm tiếng ồn nền trước khi nhận dạng. Lọc quá mạnh có thể làm mất chữ."
            >
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={denoiseOn}
                    disabled={busy}
                    onChange={(e) => setDenoiseOn(e.target.checked)}
                  />
                  Bật lọc
                </label>
                <select
                  className={`${inputClass} w-auto`}
                  value={denoiseLevel}
                  disabled={busy || !denoiseOn}
                  onChange={(e) => setDenoiseLevel(e.target.value as Exclude<DenoiseLevel, 'off'>)}
                >
                  <option value="light">Nhẹ</option>
                  <option value="medium">Vừa</option>
                  <option value="strong">Mạnh</option>
                </select>
              </div>
            </Field>
          </div>
        </details>
      </div>
    </div>
  );
}
