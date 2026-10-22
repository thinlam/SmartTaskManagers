import { useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { api, transcribeFile } from '../lib/api';
import { errorText } from '../lib/format';
import { UploadZone } from '../components/UploadZone';
import { Card, Field, PageHeader, inputClass, primaryButtonClass, secondaryButtonClass } from '../components/ui';
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
  const abortRef = useRef<AbortController | null>(null);

  const maxUploadMb = config?.maxUploadMb ?? 100;

  function handleFileSelected(file: File) {
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
      },
      (percent) => {
        setState((prev) => {
          if (prev.kind !== 'uploading') return prev;
          return percent >= 100 ? { kind: 'processing', fileName: file.name } : { ...prev, percent };
        });
      },
      controller.signal,
    )
      .then((recording) => {
        toast.success('Đã lưu bản ghi vào thư viện.');
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

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Ghi âm mới"
        subtitle="Tải lên file âm thanh — VoiceScribe chuyển thành văn bản và lưu vào thư viện của bạn."
      />

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="flex min-h-[420px] flex-col">
          {state.kind === 'idle' && <UploadZone onFileSelected={handleFileSelected} />}

          {busy && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="font-medium text-slate-900">
                {state.kind === 'uploading'
                  ? `Đang tải lên "${state.fileName}"...`
                  : `Đang nhận dạng giọng nói trong "${state.fileName}"...`}
              </p>
              {state.kind === 'uploading' ? (
                <div className="h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-indigo-600 transition-[width]" style={{ width: `${state.percent}%` }} />
                </div>
              ) : (
                <p className="max-w-sm text-xs text-slate-400">
                  Có thể mất vài phút với file dài. Bạn có thể giữ cửa sổ này mở cho đến khi xong.
                </p>
              )}
              <button onClick={() => abortRef.current?.abort()} className={`${secondaryButtonClass} text-xs`}>
                <X className="h-3 w-3" /> Hủy
              </button>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500" />
              <p className="font-medium text-slate-900">Không xử lý được file âm thanh</p>
              <p className="max-w-md text-sm text-slate-500">{state.message}</p>
              <button onClick={() => setState({ kind: 'idle' })} className={`${primaryButtonClass} mt-2`}>
                Thử lại
              </button>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="space-y-4">
            <h2 className="font-semibold text-slate-900">Tùy chọn</h2>
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
              <Field label="Số người nói (tùy chọn)" hint="Nhập đúng số người giúp tách giọng chính xác hơn.">
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
          </Card>

          <Card className="text-sm text-slate-500">
            <h2 className="mb-2 font-semibold text-slate-900">Lưu ý</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Hỗ trợ mp3, m4a, wav, mp4, webm.</li>
              <li>Tối đa {maxUploadMb}MB mỗi file.</li>
              <li>Bản ghi được lưu riêng cho tài khoản của bạn.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
