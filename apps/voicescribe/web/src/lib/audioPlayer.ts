import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface ActiveRange {
  start: number;
  end: number;
  loop: boolean;
}

export interface AudioPlayerState {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  /** Set when the browser could not load/decode the file (e.g. it was removed on the server) — shown as a banner, playback controls just stay disabled. */
  error: string | null;
  /** Non-null while playing a single block via playRange(); null once it has run past the end (loop=false) or stopRange() was called. */
  activeRange: ActiveRange | null;
  toggle: () => void;
  seekBy: (deltaSec: number) => void;
  seekTo: (sec: number) => void;
  setRate: (rate: number) => void;
  /** Plays exactly [start, end); stops (or loops back to start) once it reaches end. */
  playRange: (start: number, end: number, loop: boolean) => void;
  /** Plays a list of ranges back to back, jumping over the gaps between them —
   * for a block whose words aren't all contiguous in the original audio (text
   * pasted in from elsewhere). A single range behaves exactly like playRange. */
  playSequence: (ranges: { start: number; end: number }[], loop: boolean) => void;
  stopRange: () => void;
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

/** Thin wrapper around a plain <audio> element — kept editing-safe: nothing here reaches into segment data, it only knows times in seconds. */
export function useAudioPlayer(src: string | null): AudioPlayerState {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<ActiveRange | null>(null);
  const rangeRef = useRef<ActiveRange | null>(null);
  const sequenceRef = useRef<{ ranges: { start: number; end: number }[]; index: number; loop: boolean } | null>(
    null,
  );
  const rateRef = useRef(1);

  useEffect(() => {
    rangeRef.current = null;
    sequenceRef.current = null;
    setActiveRange(null);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrentTime(el.currentTime);
      const seq = sequenceRef.current;
      if (seq) {
        const current = seq.ranges[seq.index];
        if (current && el.currentTime >= current.end) {
          const nextIndex = seq.index + 1;
          if (nextIndex < seq.ranges.length) {
            seq.index = nextIndex;
            el.currentTime = seq.ranges[nextIndex]!.start;
          } else if (seq.loop) {
            seq.index = 0;
            el.currentTime = seq.ranges[0]!.start;
          } else {
            el.pause();
            sequenceRef.current = null;
            rangeRef.current = null;
            setActiveRange(null);
          }
        }
        return;
      }
      const range = rangeRef.current;
      if (range && el.currentTime >= range.end) {
        if (range.loop) {
          el.currentTime = range.start;
        } else {
          el.pause();
          rangeRef.current = null;
          setActiveRange(null);
        }
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoaded = () => {
      setDuration(el.duration || 0);
      el.playbackRate = rateRef.current;
    };
    const onError = () =>
      setError('Không tải được file âm thanh gốc. File có thể đã bị mất trên máy chủ.');
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setError('Không phát được âm thanh.'));
    else el.pause();
  }, []);

  const seekBy = useCallback((deltaSec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + deltaSec));
  }, []);

  const seekTo = useCallback((sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = sec;
  }, []);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
    const el = audioRef.current;
    if (el) el.playbackRate = r;
  }, []);

  const playRange = useCallback((start: number, end: number, loop: boolean) => {
    const el = audioRef.current;
    if (!el) return;
    sequenceRef.current = null;
    rangeRef.current = { start, end, loop };
    setActiveRange({ start, end, loop });
    el.currentTime = start;
    void el.play().catch(() => setError('Không phát được âm thanh.'));
  }, []);

  const playSequence = useCallback((ranges: { start: number; end: number }[], loop: boolean) => {
    const el = audioRef.current;
    const first = ranges[0];
    if (!el || !first) return;
    if (ranges.length === 1) {
      playRange(first.start, first.end, loop);
      return;
    }
    sequenceRef.current = { ranges, index: 0, loop };
    const span = { start: first.start, end: ranges[ranges.length - 1]!.end, loop };
    rangeRef.current = span;
    setActiveRange(span);
    el.currentTime = first.start;
    void el.play().catch(() => setError('Không phát được âm thanh.'));
  }, [playRange]);

  const stopRange = useCallback(() => {
    rangeRef.current = null;
    sequenceRef.current = null;
    setActiveRange(null);
    audioRef.current?.pause();
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    rate,
    error,
    activeRange,
    toggle,
    seekBy,
    seekTo,
    setRate,
    playRange,
    playSequence,
    stopRange,
  };
}
