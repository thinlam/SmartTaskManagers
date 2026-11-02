import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useToast } from '../state/AppState';

/** Container formats the server accepts (webm / m4a); the first one the engine supports wins. */
const MIME_CANDIDATES: ReadonlyArray<{ mime: string; ext: string }> = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/mp4', ext: 'm4a' },
];

/** ~64 kbps mono Opus is plenty for speech and keeps an hour near 30 MB. */
const AUDIO_BITS_PER_SECOND = 64_000;
const BAR_COUNT = 24;

type Phase = 'idle' | 'requesting' | 'recording' | 'paused';

function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Chưa được cấp quyền micro. Hãy cho phép micro trong cài đặt rồi thử lại.';
    case 'NotFoundError':
      return 'Không tìm thấy micro trên thiết bị này.';
    case 'NotReadableError':
      return 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
    default:
      return 'Không bật được micro. Vui lòng thử lại.';
  }
}

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined' &&
    MIME_CANDIDATES.some((c) => MediaRecorder.isTypeSupported(c.mime))
  );
}

/**
 * Records from the microphone. When the user presses stop, the audio is handed to `onRecorded`
 * as a File, which goes through the same upload → Whisper pipeline as a picked file.
 */
export function RecorderPanel({
  maxBytes,
  onRecorded,
}: {
  maxBytes: number;
  onRecorded: (file: File) => void;
}) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bytesRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const clockRef = useRef<number | undefined>(undefined);
  const elapsedMsRef = useRef(0);
  const resumedAtRef = useRef(0);
  const discardRef = useRef(false);

  const releaseResources = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (clockRef.current !== undefined) window.clearInterval(clockRef.current);
    clockRef.current = undefined;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setBars(Array(BAR_COUNT).fill(0));
  }, []);

  // Leaving the page mid-recording must free the microphone and drop the data.
  useEffect(() => {
    return () => {
      discardRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      releaseResources();
    };
  }, [releaseResources]);

  // Closing the tab while recording would lose everything, so ask first.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  function currentElapsedMs(): number {
    return elapsedMsRef.current + (resumedAtRef.current ? Date.now() - resumedAtRef.current : 0);
  }

  function startClock() {
    resumedAtRef.current = Date.now();
    clockRef.current = window.setInterval(
      () => setSeconds(Math.floor(currentElapsedMs() / 1000)),
      250,
    );
  }

  function stopClock() {
    if (resumedAtRef.current) elapsedMsRef.current += Date.now() - resumedAtRef.current;
    resumedAtRef.current = 0;
    if (clockRef.current !== undefined) window.clearInterval(clockRef.current);
    clockRef.current = undefined;
    setSeconds(Math.floor(elapsedMsRef.current / 1000));
  }

  function startMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (now - last < 70) return;
        last = now;
        analyser.getByteFrequencyData(data);
        // Voice sits in the low bins; average a handful of bins per bar.
        const per = Math.max(1, Math.floor(data.length / 2 / BAR_COUNT));
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < per; j++) sum += data[i * per + j] ?? 0;
          next.push(sum / per / 255);
        }
        setBars(next);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // The meter is cosmetic; recording works without it.
    }
  }

  async function start() {
    setError(null);
    if (!isRecordingSupported()) {
      setError('Thiết bị này chưa hỗ trợ ghi âm trong ứng dụng. Hãy chọn file âm thanh.');
      return;
    }
    setPhase('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      setPhase('idle');
      setError(micErrorMessage(err));
      return;
    }

    const choice = MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mime))!;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: choice.mime,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setPhase('idle');
      setError('Không khởi tạo được bộ ghi âm. Vui lòng thử lại.');
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    bytesRef.current = 0;
    elapsedMsRef.current = 0;
    discardRef.current = false;
    setSeconds(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      chunksRef.current.push(e.data);
      bytesRef.current += e.data.size;
      // Stop just before the server's size limit so the take is still accepted.
      if (bytesRef.current >= maxBytes * 0.97 && recorder.state === 'recording') {
        toast.error('Đã đạt dung lượng tối đa, bản ghi được dừng và gửi đi.');
        stop();
      }
    };
    recorder.onerror = () => {
      discardRef.current = true;
      releaseResources();
      setPhase('idle');
      setError('Quá trình ghi âm bị lỗi. Vui lòng thử lại.');
    };
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      releaseResources();
      setPhase('idle');
      if (discardRef.current) return;
      const blob = new Blob(chunks, { type: choice.mime.split(';')[0] });
      if (blob.size === 0 || elapsedMsRef.current < 1000) {
        setError('Bản ghi quá ngắn hoặc không có âm thanh. Hãy thử lại.');
        return;
      }
      onRecorded(new File([blob], `ghi-am-${stamp()}.${choice.ext}`, { type: blob.type }));
    };

    // A 1s timeslice flushes data as we go, so a crash never loses the whole take.
    recorder.start(1000);
    startMeter(stream);
    startClock();
    setPhase('recording');
  }

  function stop() {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    stopClock();
    rec.stop();
  }

  function togglePause() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      rec.pause();
      stopClock();
      setPhase('paused');
    } else if (rec.state === 'paused') {
      rec.resume();
      startClock();
      setPhase('recording');
    }
  }

  const active = phase === 'recording' || phase === 'paused';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center sm:p-12">
      <div
        className="flex h-24 items-end justify-center gap-1"
        aria-hidden="true"
        style={{ opacity: active ? 1 : 0.35 }}
      >
        {bars.map((v, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-indigo-500 transition-[height] duration-75"
            style={{ height: `${Math.max(6, Math.round(v * 96))}px` }}
          />
        ))}
      </div>

      <p
        className="font-mono text-4xl font-semibold tabular-nums text-slate-900"
        role="timer"
        aria-live="off"
      >
        {formatClock(seconds)}
      </p>

      {!active ? (
        <>
          <button
            type="button"
            onClick={() => void start()}
            disabled={phase === 'requesting'}
            aria-label="Bắt đầu ghi âm"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 disabled:opacity-60"
          >
            <Mic className="h-9 w-9" />
          </button>
          <div>
            <p className="font-medium text-slate-900">
              {phase === 'requesting' ? 'Đang bật micro...' : 'Bấm để bắt đầu ghi âm'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Khi bấm dừng, bản ghi tự được chuyển thành văn bản.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={togglePause}
              aria-label={phase === 'paused' ? 'Tiếp tục ghi' : 'Tạm dừng'}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              {phase === 'paused' ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Dừng và chuyển thành văn bản"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-700"
            >
              <Square className="h-8 w-8 fill-current" />
            </button>
          </div>
          <p className="text-sm text-slate-500">
            {phase === 'paused' ? 'Đã tạm dừng' : 'Đang ghi âm...'} · bấm ô vuông để dừng và chuyển
            thành văn bản
          </p>
        </>
      )}

      {error && (
        <p className="max-w-sm rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
